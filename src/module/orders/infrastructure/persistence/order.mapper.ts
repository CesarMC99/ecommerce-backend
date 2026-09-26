import { Order } from '../../domain/entities/order.entity';
import { OrderDoc } from './order.schema';

/** Mapper: documento de Mongoose → entidad de dominio. */
export class OrderMapper {
  static toDomain(doc: OrderDoc): Order {
    const address = doc.shippingAddress;
    return new Order(
      doc._id.toString(),
      doc.number,
      doc.userId.toString(),
      // ?? '': los pedidos de prueba anteriores a este campo no lo tienen
      doc.email ?? '',
      doc.lines.map((line) => ({
        productId: line.productId.toString(),
        slug: line.slug,
        name: line.name,
        colorName: line.colorName,
        size: line.size,
        imagePublicId: line.imagePublicId ?? null,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      doc.subtotal,
      doc.shipping,
      doc.total,
      {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        city: address.city,
        country: address.country,
      },
      doc.status,
      doc.paymentIntentId ?? null,
      doc.createdAt,
      doc.expiresAt,
      doc.paidAt ?? null,
    );
  }
}
