import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { Order } from '../../domain/entities/order.entity';
import type { OrderRepository } from '../../domain/repositories/order.repository';

/**
 * Un pedido del usuario. Si el pedido es de OTRA persona se responde
 * "no encontrado" (y no "prohibido"): así ni siquiera se revela que ese id
 * existe.
 */
@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order || !order.belongsTo(userId)) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return order;
  }
}
