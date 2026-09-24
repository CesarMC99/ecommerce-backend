import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PRODUCT_REPOSITORY } from '../../common/constants/injection-tokens';
import { GetProductBySlugUseCase } from './application/use-cases/get-product-by-slug.use-case';
import { GetProductFacetsUseCase } from './application/use-cases/get-product-facets.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import {
  ProductDocument,
  ProductSchema,
} from './infrastructure/persistence/product.schema';
import { ProductRepositoryImpl } from './infrastructure/repositories/product.repository.impl';
import { ProductsResolver } from './presentation/resolvers/products.resolver';

/**
 * Módulo de productos (catálogo).
 *
 * Aquí se hace el "cableado": la interfaz ProductRepository (token) se
 * resuelve con la implementación Mongoose. Los use-cases nunca lo saben.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
    ]),
  ],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: ProductRepositoryImpl },
    ListProductsUseCase,
    GetProductBySlugUseCase,
    GetProductFacetsUseCase,
    ProductsResolver,
  ],
  // Se exporta el repositorio para futuros módulos (carrito, pedidos) que
  // necesiten consultar precios y stock sin conocer Mongoose
  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}
