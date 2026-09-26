import { Injectable } from '@nestjs/common';
import type { Order } from '../../domain/entities/order.entity';
import { OrderLifecycleService } from '../services/order-lifecycle.service';
import { GetOrderUseCase } from './get-order.use-case';

/**
 * El navegador avisa "ya he pagado". NO nos lo creemos: preguntamos a
 * Stripe por el cobro y solo si Stripe dice "succeeded" el pedido pasa a
 * PAGADO. Es seguro llamarlo varias veces (idempotente).
 *
 * ¿Por qué existe si ya está el webhook? En local el webhook no llega sin
 * el Stripe CLI, y aunque llegue puede tardar unos segundos: así la página
 * de confirmación muestra "pagado" al instante.
 */
@Injectable()
export class ConfirmOrderPaymentUseCase {
  constructor(
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  async execute(userId: string, orderId: string): Promise<Order> {
    const order = await this.getOrderUseCase.execute(userId, orderId);
    return this.lifecycle.syncWithPayment(order);
  }
}
