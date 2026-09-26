import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CART_REPOSITORY,
  ORDER_REPOSITORY,
  PAYMENT_GATEWAY,
  PRODUCT_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { CartRepository } from '../../../cart/domain/repositories/cart.repository';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository';
import type { Order } from '../../domain/entities/order.entity';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import type {
  PaymentGateway,
  PaymentIntentSummary,
} from '../../domain/services/payment-gateway';
import { OrderMailer } from './order-mailer.service';

/** Pedidos caducados que se procesan como mucho en cada barrido. */
const SWEEP_BATCH_SIZE = 50;

/**
 * Servicio de aplicación: TODAS las transiciones de estado de un pedido.
 *
 * Un pago se puede enterar por tres caminos: el cliente vuelve a la tienda
 * (confirmOrderPayment), Stripe nos avisa (webhook) o el pedido caduca
 * (barrido). Los tres llaman a ESTE servicio, así que las reglas ("al pagar
 * se vacía el carrito", "al cancelar se devuelve el stock") viven en un
 * solo sitio y nunca se ejecutan dos veces (ver OrderRepository).
 */
@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    private readonly orderMailer: OrderMailer,
  ) {}

  /**
   * Pone el pedido al día con lo que dice Stripe (la fuente de verdad del
   * dinero). Devuelve el pedido actualizado.
   */
  async syncWithPayment(order: Order): Promise<Order> {
    if (!order.isPending() || !order.paymentIntentId) return order;

    const payment = await this.paymentGateway.retrievePaymentIntent(
      order.paymentIntentId,
    );
    return this.applyPayment(order, payment);
  }

  /** Aplica al pedido el estado de un pago ya consultado. */
  private async applyPayment(
    order: Order,
    payment: PaymentIntentSummary,
  ): Promise<Order> {
    if (payment.status === 'succeeded') {
      // Defensa extra: el importe cobrado debe ser EXACTAMENTE el del pedido
      if (payment.amount !== order.total) {
        this.logger.error(
          `Importe distinto en ${order.number}: cobrado ${payment.amount}, pedido ${order.total}`,
        );
        return order;
      }
      return this.markPaid(order);
    }
    if (payment.status === 'canceled') return this.cancel(order);
    return order;
  }

  /**
   * PENDIENTE → PAGADO. Quita del carrito lo que se ha comprado y envía el
   * correo de confirmación. Como solo UN camino gana la transición, el
   * correo nunca se envía dos veces
   */
  async markPaid(order: Order): Promise<Order> {
    const paid = await this.orderRepository.markPaidIfPending(
      order.id,
      new Date(),
    );
    // null = otro camino (webhook o cliente) ya lo marcó: no repetir nada
    if (!paid) return (await this.orderRepository.findById(order.id)) ?? order;

    // Se quitan SOLO las líneas compradas: si mientras pagaba añadió otra
    // cosa al carrito (en otra pestaña), esa se queda
    const cart = await this.cartRepository.findByUserId(order.userId);
    if (cart) {
      const remaining = paid.lines.reduce(
        (current, line) => current.removeItem(line),
        cart,
      );
      await this.cartRepository.save(remaining);
    }
    this.logger.log(`Pedido ${paid.number} pagado`);
    // void: no se espera al correo. La respuesta al cliente (y al webhook
    // de Stripe) no se retrasa por el proveedor de correo. OrderMailer
    // nunca lanza, así que no hay promesas rechazadas sin capturar
    void this.orderMailer.sendOrderConfirmation(paid);
    return paid;
  }

  /** PENDIENTE → CANCELADO. Devuelve el stock reservado a la tienda. */
  async cancel(order: Order): Promise<Order> {
    const cancelled = await this.orderRepository.cancelIfPending(order.id);
    if (!cancelled)
      return (await this.orderRepository.findById(order.id)) ?? order;

    await this.releaseStock(cancelled);
    this.logger.log(`Pedido ${cancelled.number} cancelado, stock devuelto`);
    return cancelled;
  }

  /**
   * Cierra un pedido pendiente que ya no debe seguir abierto (caducó o el
   * cliente empezó otro checkout). Antes de cancelar, pregunta a Stripe:
   * si el cliente pagó justo a tiempo, el pedido se marca PAGADO.
   */
  async close(order: Order): Promise<Order> {
    if (!order.isPending()) return order;
    if (!order.paymentIntentId) return this.cancel(order);

    const payment = await this.paymentGateway.retrievePaymentIntent(
      order.paymentIntentId,
    );
    const synced = await this.applyPayment(order, payment);
    if (!synced.isPending()) return synced;
    // "processing": el banco aún no ha respondido (no pasa con tarjeta, sí
    // con otros métodos). No se cancela: el webhook dirá cómo acaba
    if (payment.status === 'processing') return synced;

    try {
      // Anular el cobro en Stripe: así el cliente ya no puede pagar un
      // pedido cuyo stock vamos a devolver
      await this.paymentGateway.cancelPaymentIntent(order.paymentIntentId);
    } catch (error) {
      // Carrera: el cliente pagó entre la consulta y la cancelación.
      // Stripe rechaza cancelar un pago completado → volvemos a sincronizar
      const resynced = await this.syncWithPayment(order);
      if (!resynced.isPending()) return resynced;
      throw error;
    }
    return this.cancel(order);
  }

  /**
   * Barrido de pedidos caducados: devuelve su stock para que otros puedan
   * comprarlo. Un fallo en un pedido no detiene el resto.
   */
  async closeExpired(now: Date = new Date()): Promise<number> {
    const expired = await this.orderRepository.findExpiredPending(
      now,
      SWEEP_BATCH_SIZE,
    );
    for (const order of expired) {
      try {
        await this.close(order);
      } catch (error) {
        this.logger.error(`No se pudo cerrar ${order.number}`, error);
      }
    }
    return expired.length;
  }

  /** Devuelve a la tienda las unidades reservadas por el pedido. */
  async releaseStock(order: Pick<Order, 'lines'>): Promise<void> {
    for (const line of order.lines) {
      await this.productRepository.releaseStock(
        line.productId,
        line.size,
        line.quantity,
      );
    }
  }
}
