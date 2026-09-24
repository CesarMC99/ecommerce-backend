import { Args, Query, Resolver } from '@nestjs/graphql';
import { GetProductBySlugUseCase } from '../../application/use-cases/get-product-by-slug.use-case';
import { GetProductFacetsUseCase } from '../../application/use-cases/get-product-facets.use-case';
import { GetRelatedProductsUseCase } from '../../application/use-cases/get-related-products.use-case';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import { toProductType } from '../product.presenter';
import { ProductsArgs, RelatedProductsArgs } from '../inputs/products.args';
import {
  ProductFacetsType,
  ProductPageType,
  ProductType,
} from '../types/product.type';

/**
 * Resolver del catálogo (capa de presentación).
 *
 * Igual que AuthResolver, es "delgado": recibe argumentos ya validados,
 * delega en los use-cases y traduce entidades de dominio a tipos GraphQL.
 * Las queries son PÚBLICAS: el catálogo se ve sin iniciar sesión.
 */
@Resolver(() => ProductType)
export class ProductsResolver {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductBySlugUseCase: GetProductBySlugUseCase,
    private readonly getProductFacetsUseCase: GetProductFacetsUseCase,
    private readonly getRelatedProductsUseCase: GetRelatedProductsUseCase,
  ) {}

  @Query(() => ProductPageType, {
    description: 'Catálogo público con filtros, orden y paginación',
  })
  async products(@Args() args: ProductsArgs): Promise<ProductPageType> {
    const result = await this.listProductsUseCase.execute({
      ...args.filter,
      sort: args.sort,
      page: args.page,
      pageSize: args.pageSize,
    });
    return {
      ...result,
      items: result.items.map((product) => toProductType(product)),
    };
  }

  @Query(() => ProductType, {
    nullable: true,
    description:
      'Un producto por su slug; null si no existe o no está publicado',
  })
  async product(@Args('slug') slug: string): Promise<ProductType | null> {
    const product = await this.getProductBySlugUseCase.execute(slug);
    return product ? toProductType(product) : null;
  }

  @Query(() => ProductFacetsType, {
    description:
      'Colores, tallas y rango de precios disponibles para los filtros',
  })
  productFacets(): Promise<ProductFacetsType> {
    // Las facetas ya tienen la forma del tipo GraphQL: no hace falta mapear
    return this.getProductFacetsUseCase.execute();
  }

  @Query(() => [ProductType], {
    description:
      '"También te puede gustar": misma categoría, sin el producto actual',
  })
  async relatedProducts(
    @Args() args: RelatedProductsArgs,
  ): Promise<ProductType[]> {
    const products = await this.getRelatedProductsUseCase.execute(
      args.slug,
      args.limit,
    );
    return products.map((product) => toProductType(product));
  }
}
