import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MAX_QUANTITY_PER_LINE } from '../../domain/entities/cart.entity';

@Schema({ _id: false })
class CartItemSchema {
  // ObjectId y no string: permite, si algún día hace falta, hacer
  // $lookup/populate contra la colección de productos
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  size: string;

  @Prop({ required: true, min: 1, max: MAX_QUANTITY_PER_LINE })
  quantity: number;
}

/**
 * Un documento por usuario. Solo guarda qué quiere comprar (producto,
 * talla, cantidad): los precios se calculan siempre al leer.
 */
@Schema({ collection: 'carts', timestamps: true })
export class CartDocument {
  // unique: un usuario tiene UN carrito. El índice lo garantiza aunque
  // lleguen dos peticiones a la vez (la base de datos rechaza el segundo)
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [SchemaFactory.createForClass(CartItemSchema)], default: [] })
  items: CartItemSchema[];
}

export type CartDoc = HydratedDocument<CartDocument>;

export const CartSchema = SchemaFactory.createForClass(CartDocument);
