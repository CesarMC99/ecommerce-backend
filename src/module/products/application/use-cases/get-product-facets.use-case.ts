import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { ProductStatus } from '../../domain/entities/product.entity';
import type {
  ProductFacets,
  ProductRepository,
} from '../../domain/repositories/product.repository';

/**
 * Orden "natural" de las tallas de ropa. Sin él, un orden alfabético daría
 * L, M, S, XL, XS: correcto para un ordenador, absurdo para una persona.
 */
const CLOTHING_SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

/**
 * Ordena tallas como las espera un cliente: primero las de ropa (XS → XL),
 * después las numéricas de menor a mayor (37, 38...) y al final el resto
 * (p. ej. 'ÚNICA'), alfabéticamente.
 */
export function sortSizes(sizes: string[]): string[] {
  const rank = (size: string): [number, number, string] => {
    const clothingIndex = CLOTHING_SIZE_ORDER.indexOf(size.toUpperCase());
    if (clothingIndex !== -1) return [0, clothingIndex, size];
    const numeric = Number(size);
    if (!Number.isNaN(numeric)) return [1, numeric, size];
    return [2, 0, size];
  };

  return [...sizes].sort((a, b) => {
    const [groupA, valueA, textA] = rank(a);
    const [groupB, valueB, textB] = rank(b);
    return groupA - groupB || valueA - valueB || textA.localeCompare(textB);
  });
}

/**
 * Use-case: valores disponibles para los filtros del catálogo.
 *
 * Solo cuenta productos ACTIVE: un color que solo existe en un borrador no
 * debe aparecer como opción (daría "0 resultados" al elegirlo).
 */
@Injectable()
export class GetProductFacetsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(): Promise<ProductFacets> {
    const facets = await this.productRepository.findFacets(
      ProductStatus.ACTIVE,
    );
    return {
      ...facets,
      colors: [...facets.colors].sort((a, b) => a.name.localeCompare(b.name)),
      sizes: sortSizes(facets.sizes),
    };
  }
}
