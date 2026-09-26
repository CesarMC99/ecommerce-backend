import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FAVORITE_LIST_REPOSITORY } from '../../common/constants/injection-tokens';
import { ProductsModule } from '../products/products.module';
import { GetFavoriteIdsUseCase } from './application/use-cases/get-favorite-ids.use-case';
import { MergeFavoritesUseCase } from './application/use-cases/merge-favorites.use-case';
import { ToggleFavoriteUseCase } from './application/use-cases/toggle-favorite.use-case';
import {
  FavoriteListDocument,
  FavoriteListSchema,
} from './infrastructure/persistence/favorite-list.schema';
import { FavoriteListRepositoryImpl } from './infrastructure/repositories/favorite-list.repository.impl';
import { FavoritesResolver } from './presentation/resolvers/favorites.resolver';

/**
 * Módulo de favoritos. Importa ProductsModule para comprobar que un
 * producto existe y está publicado antes de guardarlo.
 */
@Module({
  imports: [
    ProductsModule,
    MongooseModule.forFeature([
      { name: FavoriteListDocument.name, schema: FavoriteListSchema },
    ]),
  ],
  providers: [
    { provide: FAVORITE_LIST_REPOSITORY, useClass: FavoriteListRepositoryImpl },
    GetFavoriteIdsUseCase,
    ToggleFavoriteUseCase,
    MergeFavoritesUseCase,
    FavoritesResolver,
  ],
})
export class FavoritesModule {}
