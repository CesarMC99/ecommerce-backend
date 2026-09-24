import { Cart } from '../../domain/entities/cart.entity';
import { CartDoc } from './cart.schema';

/** Mapper: documento de Mongoose → entidad de dominio. */
export class CartMapper {
  static toDomain(doc: CartDoc): Cart {
    return new Cart(
      doc._id.toString(),
      doc.userId.toString(),
      doc.items.map((item) => ({
        productId: item.productId.toString(),
        size: item.size,
        quantity: item.quantity,
      })),
    );
  }
}
