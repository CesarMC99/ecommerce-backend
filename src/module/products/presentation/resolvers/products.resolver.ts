import { Args, Query, Resolver } from '@nestjs/graphql';
import { GetProductBySlugUseCase } from '../../application/use-cases/get-product-by-slug.use-case';
import { GetProductFacetsUseCase } from '../../application/use-cases/get-product-facets.use-case';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import type { Product } from '../../domain/entities/product.entity';
import { ProductsArgs } from '../inputs/products.args';
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
      items: result.items.map((product) => this.toProductType(product)),
    };
  }

  @Query(() => ProductType, {
    nullable: true,
    description:
      'Un producto por su slug; null si no existe o no está publicado',
  })
  async product(@Args('slug') slug: string): Promise<ProductType | null> {
    const product = await this.getProductBySlugUseCase.execute(slug);
    return product ? this.toProductType(product) : null;
  }

  @Query(() => ProductFacetsType, {
    description:
      'Colores, tallas y rango de precios disponibles para los filtros',
  })
  productFacets(): Promise<ProductFacetsType> {
    // Las facetas ya tienen la forma del tipo GraphQL: no hace falta mapear
    return this.getProductFacetsUseCase.execute();
  }

  /**
   * Entidad de dominio → tipo GraphQL. Punto único de traducción (DRY):
   * aquí se "materializan" las reglas de la entidad en campos de la API.
   */
  private toProductType(product: Product): ProductType {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      discountPercentage: product.discountPercentage(),
      isNew: product.isNew(),
      category: product.category,
      type: product.type,
      color: product.color,
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
}
