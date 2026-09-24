import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { Product, ProductStatus } from '../../domain/entities/product.entity';
import {
  ProductSort,
  type ProductRepository,
} from '../../domain/repositories/product.repository';

export const DEFAULT_RELATED_LIMIT = 4;
export const MAX_RELATED_LIMIT = 12;

/**
 * Use-case: "También te puede gustar" en la página de un producto.
 *
 * Regla de negocio actual: productos ACTIVE de la MISMA categoría, sin
 * repetir el que se está viendo, empezando por los destacados. Vive en un
 * use-case propio para poder cambiar la regla (p. ej. "mismo color" o
 * "comprados juntos") sin tocar el resolver ni el frontend.
 */
@Injectable()
export class GetRelatedProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    slug: string,
    limit: number = DEFAULT_RELATED_LIMIT,
  ): Promise<Product[]> {
    const normalizedSlug = slug.trim().toLowerCase();
    const product = await this.productRepository.findBySlug(normalizedSlug);

    // Producto inexistente o borrador: no hay "relacionados" que mostrar
    if (!product || product.status !== ProductStatus.ACTIVE) {
      return [];
    }

    const { items } = await this.productRepository.findMany({
      status: ProductStatus.ACTIVE,
      category: product.category,
      excludeSlug: product.slug,
      sort: ProductSort.FEATURED,
      page: 1,
      // Acotado igual que la paginación: nadie puede pedir 10.000 relacionados
      pageSize: Math.min(MAX_RELATED_LIMIT, Math.max(1, Math.floor(limit))),
    });
    return items;
  }
}
