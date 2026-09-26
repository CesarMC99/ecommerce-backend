import { NotFoundException } from '@nestjs/common';
import {
  buildProduct,
  buildProductRepositoryMock,
} from '../../../products/application/use-cases/test-helpers';
import { ProductStatus } from '../../../products/domain/entities/product.entity';
import { FavoriteList } from '../../domain/entities/favorite-list.entity';
import { MergeFavoritesUseCase } from './merge-favorites.use-case';
import { ToggleFavoriteUseCase } from './toggle-favorite.use-case';

describe('Use-cases de favoritos', () => {
  const setup = (existing: FavoriteList | null = null) => {
    const productRepository = buildProductRepositoryMock();
    productRepository.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(
        [
          buildProduct({ id: 'coat' }),
          buildProduct({ id: 'draft', status: ProductStatus.DRAFT }),
        ].filter((product) => ids.includes(product.id)),
      ),
    );
    const favoriteListRepository = {
      findByUserId: jest.fn().mockResolvedValue(existing),
      save: jest.fn((list: FavoriteList) => Promise.resolve(list)),
    };
    return { productRepository, favoriteListRepository };
  };

  describe('ToggleFavoriteUseCase', () => {
    it('añade un producto publicado', async () => {
      const { productRepository, favoriteListRepository } = setup();
      const useCase = new ToggleFavoriteUseCase(
        favoriteListRepository,
        productRepository,
      );

      await expect(useCase.execute('user-1', 'coat')).resolves.toEqual([
        'coat',
      ]);
    });

    it('no deja añadir un producto que no está a la venta', async () => {
      const { productRepository, favoriteListRepository } = setup();
      const useCase = new ToggleFavoriteUseCase(
        favoriteListRepository,
        productRepository,
      );

      await expect(useCase.execute('user-1', 'draft')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('SÍ deja quitar un producto retirado (para poder limpiar la lista)', async () => {
      const { productRepository, favoriteListRepository } = setup(
        FavoriteList.empty('user-1').add('gone'),
      );
      const useCase = new ToggleFavoriteUseCase(
        favoriteListRepository,
        productRepository,
      );

      await expect(useCase.execute('user-1', 'gone')).resolves.toEqual([]);
      // Para quitar ni siquiera se consulta el producto
      expect(productRepository.findByIds).not.toHaveBeenCalled();
    });
  });

  describe('MergeFavoritesUseCase', () => {
    it('fusiona solo los productos publicados, en el orden del invitado', async () => {
      const { productRepository, favoriteListRepository } = setup(
        FavoriteList.empty('user-1').add('saved'),
      );
      const useCase = new MergeFavoritesUseCase(
        favoriteListRepository,
        productRepository,
      );

      const ids = await useCase.execute('user-1', ['draft', 'coat', 'gone']);

      expect(ids).toEqual(['coat', 'saved']);
    });
  });
});
