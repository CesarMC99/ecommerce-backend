import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { Product, ProductStatus } from '../../domain/entities/product.entity';
import type { ProductRepository } from '../../domain/repositories/product.repository';

/** Máximo de ids por petición: evita consultas gigantes. */
export const MAX_PRODUCTS_BY_IDS = 100;

/**
 * Use-case: varios productos por id, en el MISMO orden en que se piden.
 *
 * Lo usa la página de favoritos (el orden es "el último guardado primero"
 * y debe respetarse). Solo devuelve productos publicados: si uno se retiró,
 * desaparece de la lista sin dar error.
 */
@Injectable()
export class GetProductsByIdsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(ids: string[]): Promise<Product[]> {
    // Sin duplicados y acotado (el resolver ya valida, esto es la segunda red)
    const uniqueIds = [...new Set(ids)].slice(0, MAX_PRODUCTS_BY_IDS);
    const products = await this.productRepository.findByIds(uniqueIds);

    // findByIds no garantiza el orden: se reordena según los ids pedidos
    const byId = new Map(products.map((product) => [product.id, product]));
    return uniqueIds
      .map((id) => byId.get(id))
      .filter(
        (product): product is Product =>
          product !== undefined && product.status === ProductStatus.ACTIVE,
      );
  }
}
