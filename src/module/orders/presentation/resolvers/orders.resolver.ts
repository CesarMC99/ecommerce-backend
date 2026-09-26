import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { ConfirmOrderPaymentUseCase } from '../../application/use-cases/confirm-order-payment.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { ListMyOrdersUseCase } from '../../application/use-cases/list-my-orders.use-case';
import { StartCheckoutUseCase } from '../../application/use-cases/start-checkout.use-case';
import type { Order } from '../../domain/entities/order.entity';
import { MyOrdersArgs } from '../inputs/my-orders.args';
import { CheckoutInput } from '../inputs/shipping-address.input';
import {
  CheckoutSessionType,
  OrderPageType,
  OrderType,
} from '../types/order.type';

/**
 * Resolver de pedidos y checkout. TODO exige sesión (el checkout es solo
 * con cuenta) y opera siempre sobre los pedidos del usuario del token.
 */
@Resolver(() => OrderType)
@UseGuards(JwtAuthGuard)
export class OrdersResolver {
  constructor(
    private readonly startCheckoutUseCase: StartCheckoutUseCase,
    private readonly confirmOrderPaymentUseCase: ConfirmOrderPaymentUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listMyOrdersUseCase: ListMyOrdersUseCase,
  ) {}

  @Query(() => OrderPageType, {
    description:
      'Historial de pedidos pagados del usuario (más reciente primero)',
  })
  async myOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Args() args: MyOrdersArgs,
  ): Promise<OrderPageType> {
    const result = await this.listMyOrdersUseCase.execute(
      user.userId,
      args.page,
      args.pageSize,
    );
    return { ...result, items: result.items.map(toOrderType) };
  }

  @Mutation(() => CheckoutSessionType, {
    description:
      'Crea el pedido con el carrito actual, reserva el stock y prepara el pago',
  })
  async startCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CheckoutInput,
  ): Promise<CheckoutSessionType> {
    const session = await this.startCheckoutUseCase.execute({
      userId: user.userId,
      email: input.email,
      shippingAddress: { ...input.shippingAddress },
    });
    return {
      order: toOrderType(session.order),
      clientSecret: session.clientSecret,
    };
  }

  @Mutation(() => OrderType, {
    description: 'Comprueba el pago con Stripe y actualiza el pedido',
  })
  async confirmOrderPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Args('orderId', { type: () => ID }) orderId: string,
  ): Promise<OrderType> {
    return toOrderType(
      await this.confirmOrderPaymentUseCase.execute(user.userId, orderId),
    );
  }

  @Query(() => OrderType, { description: 'Un pedido del usuario' })
  async order(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<OrderType> {
    return toOrderType(await this.getOrderUseCase.execute(user.userId, id));
  }
}

/** Entidad → tipo GraphQL. Punto único de traducción (sin paymentIntentId). */
function toOrderType(order: Order): OrderType {
  return {
    id: order.id,
    number: order.number,
    email: order.email,
    status: order.status,
    lines: order.lines.map((line) => ({ ...line })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    shippingAddress: { ...order.shippingAddress },
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
  };
}
