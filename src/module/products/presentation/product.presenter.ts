import type { Product } from '../domain/entities/product.entity';
import type { ProductType } from './types/product.type';

/**
 * Presenter: entidad de dominio → tipo GraphQL.
 *
 * Antes era un método privado del ProductsResolver. Ahora lo necesita
 * también el carrito (cada línea devuelve su producto), así que se extrae
 * aquí: UN solo punto de traducción, y cualquier campo nuevo del producto
 * aparece automáticamente en el catálogo, el detalle y el carrito (DRY).
 *
 * Aquí se "materializan" las reglas de la entidad (descuento, novedad,
 * stock) en campos de la API.
 */
export function toProductType(product: Product): ProductType {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    details: product.details,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    discountPercentage: product.discountPercentage(),
    isNew: product.isNew(),
    category: product.category,
    type: product.type,
    color: product.color,
    // Se expone SI hay stock, no CUÁNTO (dato de negocio)
    sizes: product.sizes.map((size) => ({
      size: size.size,
      inStock: size.stock > 0,
    })),
    inStock: product.isInStock(),
    images: product.images,
    mainImage: product.mainImage(),
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    isFeatured: product.isFeatured,
    publishedAt: product.publishedAt,
  };
}
