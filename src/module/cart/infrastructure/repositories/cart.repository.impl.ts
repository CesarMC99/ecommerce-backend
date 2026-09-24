import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from '../../domain/entities/cart.entity';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartMapper } from '../persistence/cart.mapper';
import { CartDocument } from '../persistence/cart.schema';

/** Implementación Mongoose del CartRepository (token CART_REPOSITORY). */
@Injectable()
export class CartRepositoryImpl implements CartRepository {
  constructor(
    @InjectModel(CartDocument.name)
    private readonly cartModel: Model<CartDocument>,
  ) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    const doc = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    return doc ? CartMapper.toDomain(doc) : null;
  }

  async save(cart: Cart): Promise<Cart> {
    // Upsert por usuario: crea el carrito la primera vez y lo reemplaza
    // después. Una sola operación atómica: no hay "leer, luego escribir"
    // que dos pestañas pudieran pisarse
    const doc = await this.cartModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(cart.userId) },
        {
          $set: {
            items: cart.items.map((item) => ({
              productId: new Types.ObjectId(item.productId),
              size: item.size,
              quantity: item.quantity,
            })),
          },
        },
        { upsert: true, new: true, runValidators: true },
      )
      .exec();
    return CartMapper.toDomain(doc);
  }
}
