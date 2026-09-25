import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { GetFavoriteIdsUseCase } from '../../application/use-cases/get-favorite-ids.use-case';
import { MergeFavoritesUseCase } from '../../application/use-cases/merge-favorites.use-case';
import { ToggleFavoriteUseCase } from '../../application/use-cases/toggle-favorite.use-case';
import {
  MergeFavoritesArgs,
  ToggleFavoriteArgs,
} from '../inputs/favorites.args';

/**
 * Favoritos del usuario con sesión. Todo exige sesión y opera SIEMPRE
 * sobre el usuario del token (no hay argumento userId). Los invitados
 * guardan sus favoritos en el navegador.
 *
 * Todas las operaciones devuelven la lista de ids actualizada: la UI la
 * escribe en su caché y todos los corazones se actualizan a la vez.
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class FavoritesResolver {
  constructor(
    private readonly getFavoriteIdsUseCase: GetFavoriteIdsUseCase,
    private readonly toggleFavoriteUseCase: ToggleFavoriteUseCase,
    private readonly mergeFavoritesUseCase: MergeFavoritesUseCase,
  ) {}

  @Query(() => [ID], {
    description: 'Ids de mis favoritos, el más reciente primero',
  })
  myFavoriteIds(@CurrentUser() user: AuthenticatedUser): Promise<string[]> {
    return this.getFavoriteIdsUseCase.execute(user.userId);
  }

  @Mutation(() => [ID], {
    description: 'Añade o quita un producto de favoritos',
  })
  toggleFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Args() args: ToggleFavoriteArgs,
  ): Promise<string[]> {
    return this.toggleFavoriteUseCase.execute(user.userId, args.productId);
  }

  @Mutation(() => [ID], {
    description: 'Une los favoritos de invitado con los de la cuenta',
  })
  mergeFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Args() args: MergeFavoritesArgs,
  ): Promise<string[]> {
    return this.mergeFavoritesUseCase.execute(user.userId, args.productIds);
  }
}
