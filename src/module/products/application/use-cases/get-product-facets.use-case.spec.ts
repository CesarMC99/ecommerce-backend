import { ProductStatus } from '../../domain/entities/product.entity';
import {
  GetProductFacetsUseCase,
  sortSizes,
} from './get-product-facets.use-case';
import { buildProductRepositoryMock } from './test-helpers';

describe('sortSizes', () => {
  it('ordena ropa XS → XL, luego números, luego el resto', () => {
    expect(sortSizes(['ÚNICA', 'L', '38', 'XS', 'M', '37', 'XL', 'S'])).toEqual(
      ['XS', 'S', 'M', 'L', 'XL', '37', '38', 'ÚNICA'],
    );
  });

  it('ordena los números por valor, no alfabéticamente (9 antes que 10)', () => {
    expect(sortSizes(['10', '9', '41'])).toEqual(['9', '10', '41']);
  });

  it('no modifica el array original', () => {
    const sizes = ['M', 'S'];
    sortSizes(sizes);
    expect(sizes).toEqual(['M', 'S']);
  });
});

describe('GetProductFacetsUseCase', () => {
  const setup = () => {
    const productRepository = buildProductRepositoryMock();
    const useCase = new GetProductFacetsUseCase(productRepository);
    return { useCase, productRepository };
  };

  it('solo calcula las facetas de productos ACTIVE', async () => {
    const { useCase, productRepository } = setup();

    await useCase.execute();

    expect(productRepository.findFacets).toHaveBeenCalledWith(
      ProductStatus.ACTIVE,
    );
  });

  it('devuelve colores por nombre y tallas en orden natural', async () => {
    const { useCase, productRepository } = setup();
    productRepository.findFacets.mockResolvedValue({
      colors: [
        { name: 'Tierra', hex: '#8a6a4a' },
        { name: 'Arena', hex: '#d8c4a8' },
      ],
      sizes: ['L', 'S', 'ÚNICA', 'M'],
      minPrice: 2900,
      maxPrice: 21500,
    });

    const facets = await useCase.execute();

    expect(facets.colors.map((color) => color.name)).toEqual([
      'Arena',
      'Tierra',
    ]);
    expect(facets.sizes).toEqual(['S', 'M', 'L', 'ÚNICA']);
    expect(facets.minPrice).toBe(2900);
    expect(facets.maxPrice).toBe(21500);
  });
});
