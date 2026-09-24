import { Product } from '../../domain/entities/product.entity';
import { ProductDoc } from './product.schema';

/**
 * Mapper: documento de Mongoose → entidad de dominio.
 * Único lugar donde se conoce la forma de ambos mundos (igual que UserMapper).
 */
export class ProductMapper {
  static toDomain(doc: ProductDoc): Product {
    return new Product(
      doc._id.toString(),
      doc.slug,
      doc.name,
      doc.description,
      doc.price,
      doc.compareAtPrice,
      doc.category,
      doc.type,
      { name: doc.color.name, hex: doc.color.hex },
      // Se copian a objetos planos: la entidad no debe arrastrar
      // subdocumentos de Mongoose (con sus métodos y estado internos)
      doc.sizes.map((size) => ({ size: size.size, stock: size.stock })),
      doc.images.map((image) => ({
        publicId: image.publicId,
        alt: image.alt,
        width: image.width,
        height: image.height,
      })),
      doc.rating,
      doc.reviewsCount,
      doc.isFeatured,
      doc.status,
      doc.publishedAt,
      doc.createdAt,
    );
  }
}
