import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderStatus } from '../../domain/entities/order.entity';

registerEnumType(OrderStatus, { name: 'OrderStatus' });

@ObjectType('OrderLine')
export class OrderLineType {
  @Field()
  productId: string;

  @Field({ description: 'Slug en el momento de la compra (enlace a la ficha)' })
  slug: string;

  @Field()
  name: string;

  @Field()
  colorName: string;

  @Field()
  size: string;

  @Field(() => String, {
    nullable: true,
    description: 'publicId de Cloudinary de la foto principal',
  })
  imagePublicId: string | null;

  @Field(() => Int, { description: 'Precio unitario pagado, en céntimos' })
  unitPrice: number;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int, { description: 'Precio × cantidad, en céntimos' })
  lineTotal: number;
}

@ObjectType('ShippingAddress')
export class ShippingAddressType {
  @Field()
  fullName: string;

  @Field({ description: 'Formato internacional: +34612345678' })
  phone: string;

  @Field()
  line1: string;

  @Field()
  city: string;

  @Field({ description: 'Código ISO del país (ES, MX...)' })
  country: string;
}

/**
 * Pedido tal como lo ve su dueño. No expone el paymentIntentId: es un
 * detalle interno de Stripe que el cliente no necesita.
 */
@ObjectType('Order')
export class OrderType {
  @Field(() => ID)
  id: string;

  @Field({ description: 'Número legible: AMB-XXXXXXXX' })
  number: string;

  @Field({ description: 'Correo de contacto del pedido' })
  email: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => [OrderLineType])
  lines: OrderLineType[];

  @Field(() => Int, { description: 'En céntimos' })
  subtotal: number;

  @Field(() => Int, { description: 'En céntimos (0 = gratis)' })
  shipping: number;

  @Field(() => Int, { description: 'En céntimos' })
  total: number;

  @Field(() => ShippingAddressType)
  shippingAddress: ShippingAddressType;

  @Field()
  createdAt: Date;

  @Field({ description: 'Límite para pagar antes de que caduque' })
  expiresAt: Date;

  @Field(() => Date, { nullable: true })
  paidAt: Date | null;
}

/** Lo que necesita el navegador para mostrar el formulario de Stripe. */
@ObjectType('CheckoutSession')
export class CheckoutSessionType {
  @Field(() => OrderType)
  order: OrderType;

  @Field({
    description:
      'Secreto del PaymentIntent: solo permite pagar ESTE pedido, por ESTE importe',
  })
  clientSecret: string;
}
