import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  CART_REPOSITORY,
  LOCATION_DIRECTORY,
  ORDER_REPOSITORY,
  PAYMENT_GATEWAY,
  PRODUCT_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import { CartPricer } from '../../../cart/application/services/cart-pricer.service';
import type { LocationDirectory } from '../../../locations/domain/location-directory';
import { normalizePhone } from '../../../locations/domain/phone-number';
import type { CartRepository } from '../../../cart/domain/repositories/cart.repository';
import type { PricedCartLine } from '../../../cart/domain/services/cart-pricing';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository';
import {
  type Order,
  type OrderLine,
  PAYMENT_WINDOW_MINUTES,
  type ShippingAddress,
} from '../../domain/entities/order.entity';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { generateOrderNumber } from '../../domain/services/order-number';
import type { PaymentGateway } from '../../domain/services/payment-gateway';
import { OrderLifecycleService } from '../services/order-lifecycle.service';

export interface StartCheckoutCommand {
  userId: string;
  /** Correo de contacto del pedido (puede no ser el de la cuenta) */
  email: string;
  shippingAddress: ShippingAddress;
}

export interface CheckoutSession {
  order: Order;
  /** Llave de un solo pedido para que el navegador pague con Stripe */
  clientSecret: string;
}

/**
 * Empieza el pago del carrito del usuario.
 *
 * 0. Valida la dirección (país de envío, ciudad del listado, teléfono).
 * 1. Cierra su pedido pendiente anterior (si recargó o volvió atrás).
 * 2. Calcula el carrito con las MISMAS reglas que la página del carrito.
 * 3. RESERVA el stock: desde este momento esas unidades son suyas durante
 *    30 min. Sin reserva, dos personas podrían pagar la última talla M.
 * 4. Crea el pedido (foto fija de precios) y el cobro en Stripe por el
 *    importe que calcula el backend. El navegador nunca decide cuánto paga.
 *
 * Si algo falla a mitad, se deshace lo hecho (stock devuelto, pedido
 * cancelado): nunca quedan unidades "secuestradas".
 */
@Injectable()
export class StartCheckoutUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    @Inject(LOCATION_DIRECTORY)
    private readonly locationDirectory: LocationDirectory,
    private readonly cartPricer: CartPricer,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  async execute(command: StartCheckoutCommand): Promise<CheckoutSession> {
    // Lo primero, antes de tocar stock ni pedidos: si la dirección no vale,
    // no se hace NADA
    const shippingAddress = this.validateAddress(command.shippingAddress);

    // Un solo pedido abierto por usuario: si ya había uno, se cierra y su
    // stock vuelve a la tienda antes de reservar de nuevo
    const previous = await this.orderRepository.findPendingByUser(
      command.userId,
    );
    if (previous) await this.lifecycle.close(previous);

    const cart = await this.cartRepository.findByUserId(command.userId);
    const priced = await this.cartPricer.price(cart?.items ?? []);
    const lines = priced.lines;

    if (lines.length === 0) {
      throw new BadRequestException('Tu carrito está vacío');
    }
    if (lines.some((line) => line.unavailableReason !== null)) {
      throw new ConflictException(
        'Algunos productos de tu carrito ya no están disponibles. Revísalo antes de pagar',
      );
    }

    const orderLines = lines.map(toOrderLine);
    await this.reserveAll(orderLines);

    let order: Order | null = null;
    try {
      order = await this.orderRepository.create({
        number: generateOrderNumber(),
        userId: command.userId,
        lines: orderLines,
        subtotal: priced.subtotal,
        shipping: priced.shipping,
        total: priced.total,
        email: command.email,
        shippingAddress,
        expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60_000),
      });

      const payment = await this.paymentGateway.createPaymentIntent({
        amount: order.total,
        orderId: order.id,
        orderNumber: order.number,
        customerEmail: command.email,
      });
      await this.orderRepository.setPaymentIntentId(order.id, payment.id);

      return {
        order: order.withPaymentIntent(payment.id),
        clientSecret: payment.clientSecret,
      };
    } catch (error) {
      // Deshacer: si el pedido llegó a crearse, cancelarlo devuelve el
      // stock; si no, se devuelve directamente
      if (order) await this.lifecycle.cancel(order);
      else await this.lifecycle.releaseStock({ lines: orderLines });
      throw error;
    }
  }

  /**
   * Comprueba la dirección contra el directorio de ubicaciones y la
   * normaliza: ciudad con su nombre oficial ("malaga" → "Málaga") y
   * teléfono en formato internacional (+34612345678).
   */
  private validateAddress(address: ShippingAddress): ShippingAddress {
    if (!this.locationDirectory.findCountry(address.country)) {
      throw new BadRequestException('De momento no enviamos a ese país');
    }
    const city = this.locationDirectory.findCity(address.country, address.city);
    if (!city) {
      throw new BadRequestException('Elige una ciudad de la lista');
    }
    const phone = normalizePhone(address.phone, address.country);
    if (!phone) {
      throw new BadRequestException(
        'El teléfono no es válido para el país elegido',
      );
    }
    return { ...address, city: city.name, phone };
  }

  /**
   * Reserva línea a línea. Si una falla (alguien compró la última unidad
   * hace un segundo), se devuelven las que ya se habían reservado.
   */
  private async reserveAll(lines: OrderLine[]): Promise<void> {
    const reserved: OrderLine[] = [];
    for (const line of lines) {
      const ok = await this.productRepository.reserveStock(
        line.productId,
        line.size,
        line.quantity,
      );
      if (!ok) {
        await this.lifecycle.releaseStock({ lines: reserved });
        throw new ConflictException(
          `Ya no quedan unidades suficientes de ${line.name} (talla ${line.size})`,
        );
      }
      reserved.push(line);
    }
  }
}

/** Línea calculada del carrito → línea del pedido (foto fija). */
function toOrderLine(line: PricedCartLine): OrderLine {
  // Solo se llama con líneas disponibles, que siempre tienen producto
  const product = line.product!;
  return {
    productId: line.productId,
    slug: product.slug,
    name: product.name,
    colorName: product.color.name,
    size: line.size,
    imagePublicId: product.mainImage()?.publicId ?? null,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    lineTotal: line.lineTotal,
  };
}
