import { Inject, Injectable } from '@nestjs/common';
import { FAVORITE_LIST_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { FavoriteListRepository } from '../../domain/repositories/favorite-list.repository';

/**
 * Use-case: ids de los favoritos del usuario (más reciente primero).
 *
 * Solo ids: bastan para pintar los corazones en toda la tienda. La página
 * /favoritos pide los productos con `productsByIds` (el mismo camino que
 * usa un invitado), que además descarta los que ya no están a la venta.
 */
@Injectable()
export class GetFavoriteIdsUseCase {
  constructor(
    @Inject(FAVORITE_LIST_REPOSITORY)
    private readonly favoriteListRepository: FavoriteListRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    const list = await this.favoriteListRepository.findByUserId(userId);
    return [...(list?.productIds ?? [])];
  }
}
