import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FAVORITE_LIST_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import { ProductStatus } from '../../../products/domain/entities/product.entity';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository';
import { FavoriteList } from '../../domain/entities/favorite-list.entity';
import type { FavoriteListRepository } from '../../domain/repositories/favorite-list.repository';

/**
 * Use-case: el corazón. Si el producto está en favoritos lo quita; si no,
 * lo añade. Devuelve la lista actualizada de ids.
 *
 * Solo se valida el producto al AÑADIR: quitar siempre debe funcionar,
 * aunque el producto se haya retirado de la tienda (si no, el usuario no
 * podría limpiar su lista).
 */
@Injectable()
export class ToggleFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_LIST_REPOSITORY)
    private readonly favoriteListRepository: FavoriteListRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(userId: string, productId: string): Promise<string[]> {
    const list =
      (await this.favoriteListRepository.findByUserId(userId)) ??
      FavoriteList.empty(userId);

    if (!list.has(productId)) {
      const [product] = await this.productRepository.findByIds([productId]);
      if (!product || product.status !== ProductStatus.ACTIVE) {
        throw new NotFoundException('Este producto ya no está disponible');
      }
    }

    const saved = await this.favoriteListRepository.save(
      list.toggle(productId),
    );
    return [...saved.productIds];
  }
}
