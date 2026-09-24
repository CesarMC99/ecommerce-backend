import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../../common/constants/injection-tokens';
import {
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';
import {
  ProductSort,
  type ProductRepository,
  type ProductSearchResult,
} from '../../domain/repositories/product.repository';

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

export interface ListProductsCommand {
  category?: ProductCategory;
  color?: string;
  maxPrice?: number;
  onSale?: boolean;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ListProductsResult extends ProductSearchResult {
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Use-case: listar el catálogo público con filtros, orden y paginación.
 *
 * Aquí viven las reglas que NO dependen de la base de datos ni de GraphQL:
 * - El público solo ve productos ACTIVE (los borradores nunca se filtran,
 *   aunque alguien los pida a mano por la API)
 * - La paginación se normaliza: página mínima 1 y tamaño acotado, para que
 *   nadie pueda pedir 1.000.000 de productos de golpe y tumbar el servidor
 */
@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    command: ListProductsCommand = {},
  ): Promise<ListProductsResult> {
    const page = Math.max(1, Math.floor(command.page ?? 1));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(command.pageSize ?? DEFAULT_PAGE_SIZE)),
    );

    const { items, totalCount } = await this.productRepository.findMany({
      status: ProductStatus.ACTIVE,
      category: command.category,
      color: command.color,
      maxPrice: command.maxPrice,
      onSale: command.onSale,
      featured: command.featured,
      sort: command.sort ?? ProductSort.FEATURED,
      page,
      pageSize,
    });

    return {
      items,
      totalCount,
      page,
      pageSize,
      // Con 0 resultados hay 0 páginas (la UI muestra "sin resultados")
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }
}
