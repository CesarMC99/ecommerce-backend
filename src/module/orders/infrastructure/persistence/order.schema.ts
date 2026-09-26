import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../domain/entities/order.entity';

@Schema({ _id: false })
class OrderLineSchema {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  // Copias del producto EN EL MOMENTO de la compra (foto fija, ver entidad)
  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  colorName: string;

  @Prop({ required: true })
  size: string;

  @Prop({ type: String, default: null })
  imagePublicId: string | null;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;
}

@Schema({ _id: false })
class ShippingAddressSchema {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  line1: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true })
  country: string;
}

@Schema({ collection: 'orders', timestamps: true })
export class OrderDocument {
  // unique: el número se enseña al cliente, nunca puede repetirse
  @Prop({ required: true, unique: true })
  number: string;

  // index: "Mis pedidos" y "¿tiene un pedido pendiente?" filtran por usuario
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  // Correo de contacto del pedido (recibo de Stripe, avisos de envío)
  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ type: [SchemaFactory.createForClass(OrderLineSchema)], default: [] })
  lines: OrderLineSchema[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  shipping: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({
    type: SchemaFactory.createForClass(ShippingAddressSchema),
    required: true,
  })
  shippingAddress: ShippingAddressSchema;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  // sparse: muchos pedidos podrían tenerlo a null un instante; el índice
  // solo incluye los que ya tienen PaymentIntent (lo busca el webhook)
  @Prop({ type: String, default: null, index: { unique: true, sparse: true } })
  paymentIntentId: string | null;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  // Lo rellena `timestamps: true`; se declara para que TypeScript lo conozca
  createdAt: Date;
}

export type OrderDoc = HydratedDocument<OrderDocument>;

export const OrderSchema = SchemaFactory.createForClass(OrderDocument);

// Índice para el barrido de caducados: "pendientes cuyo plazo ya venció"
OrderSchema.index({ status: 1, expiresAt: 1 });
