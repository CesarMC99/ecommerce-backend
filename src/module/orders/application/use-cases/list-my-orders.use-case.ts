import { Inject, Injectable } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { type Order, OrderStatus } from '../../domain/entities/order.entity';
import type { OrderRepository } from '../../domain/repositories/order.repository';

/** Máximo de pedidos por página (evita pedir 10.000 de golpe). */
export const MAX_ORDERS_PAGE_SIZE = 50;

/**
 * Estados que ve el cliente en "Mis pedidos". Los pendientes y cancelados
 * NO: nunca se cobraron y se crean cada vez que alguien vuelve a empezar el
 * checkout, así que solo meterían ruido. (Cuando el panel de administración
 * añada "enviado" y "entregado", se sumarán aquí)
 */
export const CUSTOMER_VISIBLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PAID,
];

export interface OrderPage {
  items: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Historial de pedidos del usuario, el más reciente primero. */
@Injectable()
export class ListMyOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<OrderPage> {
    const size = Math.min(Math.max(1, pageSize), MAX_ORDERS_PAGE_SIZE);
    const current = Math.max(1, page);
    const { items, totalCount } = await this.orderRepository.findPageByUser(
      userId,
      CUSTOMER_VISIBLE_STATUSES,
      current,
      size,
    );
    return {
      items,
      totalCount,
      page: current,
      pageSize: size,
      totalPages: Math.max(1, Math.ceil(totalCount / size)),
    };
  }
}
