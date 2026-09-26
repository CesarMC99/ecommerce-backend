import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ORDER_REPOSITORY,
  PAYMENT_GATEWAY,
} from '../../common/constants/injection-tokens';
import { CartModule } from '../cart/cart.module';
import { LocationsModule } from '../locations/locations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsModule } from '../products/products.module';
import { ExpiredOrdersSweeper } from './application/services/expired-orders.sweeper';
import { OrderLifecycleService } from './application/services/order-lifecycle.service';
import { OrderMailer } from './application/services/order-mailer.service';
import { ConfirmOrderPaymentUseCase } from './application/use-cases/confirm-order-payment.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { HandlePaymentEventUseCase } from './application/use-cases/handle-payment-event.use-case';
import { StartCheckoutUseCase } from './application/use-cases/start-checkout.use-case';
import { StripePaymentGateway } from './infrastructure/payments/stripe-payment.gateway';
import {
  OrderDocument,
  OrderSchema,
} from './infrastructure/persistence/order.schema';
import { OrderRepositoryImpl } from './infrastructure/repositories/order.repository.impl';
import { StripeWebhookController } from './presentation/controllers/stripe-webhook.controller';
import { OrdersResolver } from './presentation/resolvers/orders.resolver';

/**
 * Módulo de pedidos y checkout. Usa el carrito (qué se compra y a qué
 * precio) y los productos (reserva de stock); Stripe entra solo a través
 * del token PAYMENT_GATEWAY.
 */
@Module({
  imports: [
    ProductsModule,
    CartModule,
    LocationsModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: OrderDocument.name, schema: OrderSchema },
    ]),
  ],
  controllers: [StripeWebhookController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: OrderRepositoryImpl },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
    OrderLifecycleService,
    OrderMailer,
    ExpiredOrdersSweeper,
    StartCheckoutUseCase,
    ConfirmOrderPaymentUseCase,
    GetOrderUseCase,
    HandlePaymentEventUseCase,
    OrdersResolver,
  ],
})
export class OrdersModule {}
