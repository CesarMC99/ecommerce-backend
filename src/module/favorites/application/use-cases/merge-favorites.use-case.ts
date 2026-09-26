import { Inject, Injectable } from '@nestjs/common';
import {
  FAVORITE_LIST_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import { ProductStatus } from '../../../products/domain/entities/product.entity';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository';
import { FavoriteList } from '../../domain/entities/favorite-list.entity';
import type { FavoriteListRepository } from '../../domain/repositories/favorite-list.repository';

/**
 * Use-case: al iniciar sesión, los favoritos del invitado se unen a los de
 * la cuenta. Los ids de productos inexistentes o retirados se descartan en
 * silencio (igual que en la fusión del carrito).
 */
@Injectable()
export class MergeFavoritesUseCase {
  constructor(
    @Inject(FAVORITE_LIST_REPOSITORY)
    private readonly favoriteListRepository: FavoriteListRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(userId: string, guestProductIds: string[]): Promise<string[]> {
    const products = await this.productRepository.findByIds(guestProductIds);
    const validIds = new Set(
      products
        .filter((product) => product.status === ProductStatus.ACTIVE)
        .map((product) => product.id),
    );
    // Se conserva el ORDEN del invitado (el más reciente primero)
    const validGuestIds = guestProductIds.filter((id) => validIds.has(id));

    const list =
      (await this.favoriteListRepository.findByUserId(userId)) ??
      FavoriteList.empty(userId);
    const saved = await this.favoriteListRepository.save(
      list.merge(validGuestIds),
    );
    return [...saved.productIds];
  }
}
