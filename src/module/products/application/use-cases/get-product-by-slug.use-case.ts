import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { Product, ProductStatus } from '../../domain/entities/product.entity';
import type { ProductRepository } from '../../domain/repositories/product.repository';

/**
 * Use-case: obtener un producto por su slug (página de detalle).
 *
 * Devuelve null (y no lanza error) si no existe O si es un borrador: para
 * el público, un borrador "no existe". Responder distinto en cada caso
 * revelaría qué productos se están preparando antes de publicarlos.
 */
@Injectable()
export class GetProductBySlugUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(slug: string): Promise<Product | null> {
    const product = await this.productRepository.findBySlug(
      slug.trim().toLowerCase(),
    );
    if (!product || product.status !== ProductStatus.ACTIVE) {
      return null;
    }
    return product;
  }
}
