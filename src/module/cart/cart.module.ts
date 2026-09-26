import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CART_REPOSITORY } from '../../common/constants/injection-tokens';
import { ProductsModule } from '../products/products.module';
import { CartPricer } from './application/services/cart-pricer.service';
import { AddCartItemUseCase } from './application/use-cases/add-cart-item.use-case';
import { ClearCartUseCase } from './application/use-cases/clear-cart.use-case';
import { GetCartUseCase } from './application/use-cases/get-cart.use-case';
import { MergeCartUseCase } from './application/use-cases/merge-cart.use-case';
import { QuoteCartUseCase } from './application/use-cases/quote-cart.use-case';
import { UpdateCartItemUseCase } from './application/use-cases/update-cart-item.use-case';
import {
  CartDocument,
  CartSchema,
} from './infrastructure/persistence/cart.schema';
import { CartRepositoryImpl } from './infrastructure/repositories/cart.repository.impl';
import { CartResolver } from './presentation/resolvers/cart.resolver';

/**
 * Módulo del carrito. Importa ProductsModule para usar PRODUCT_REPOSITORY
 * (los precios y el stock vienen SIEMPRE del producto actual).
 */
@Module({
  imports: [
    ProductsModule,
    MongooseModule.forFeature([
      { name: CartDocument.name, schema: CartSchema },
    ]),
  ],
  providers: [
    { provide: CART_REPOSITORY, useClass: CartRepositoryImpl },
    CartPricer,
    GetCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    MergeCartUseCase,
    QuoteCartUseCase,
    ClearCartUseCase,
    CartResolver,
  ],
  // El checkout (módulo orders) necesita leer el carrito y calcular su
  // precio con EXACTAMENTE las mismas reglas: se exportan en vez de copiarse
  exports: [CART_REPOSITORY, CartPricer],
})
export class CartModule {}
