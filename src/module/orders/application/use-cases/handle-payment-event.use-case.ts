import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import type { PaymentEvent } from '../../domain/services/payment-gateway';
import { OrderLifecycleService } from '../services/order-lifecycle.service';

/**
 * Procesa un aviso de Stripe (webhook) ya verificado.
 *
 * Es el camino "garantizado": aunque el cliente cierre la pestaña justo
 * después de pagar, Stripe nos avisa (y reintenta durante días si nuestro
 * servidor no responde), así que ningún pago se queda sin registrar.
 */
@Injectable()
export class HandlePaymentEventUseCase {
  private readonly logger = new Logger(HandlePaymentEventUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  async execute(event: PaymentEvent): Promise<void> {
    const order = await this.orderRepository.findByPaymentIntentId(
      event.paymentIntentId,
    );
    if (!order) {
      // Un cobro que no es de ningún pedido (p. ej. uno de prueba creado
      // desde el Dashboard). Se ignora sin error para que Stripe no reintente
      this.logger.warn(`Aviso de un pago sin pedido: ${event.paymentIntentId}`);
      return;
    }

    switch (event.type) {
      case 'payment_succeeded':
        // Se vuelve a consultar el cobro (y su importe) en vez de fiarse
        // solo del aviso: una única regla para marcar como pagado
        await this.lifecycle.syncWithPayment(order);
        return;
      case 'payment_canceled':
        await this.lifecycle.cancel(order);
        return;
      case 'payment_failed':
        // Tarjeta rechazada: el pedido sigue pendiente y el cliente puede
        // reintentar con otra tarjeta hasta que caduque
        return;
    }
  }
}
