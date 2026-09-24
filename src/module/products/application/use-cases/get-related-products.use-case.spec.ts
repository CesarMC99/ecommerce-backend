import {
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';
import { ProductSort } from '../../domain/repositories/product.repository';
import {
  GetRelatedProductsUseCase,
  MAX_RELATED_LIMIT,
} from './get-related-products.use-case';
import { buildProduct, buildProductRepositoryMock } from './test-helpers';

describe('GetRelatedProductsUseCase', () => {
  const setup = () => {
    const productRepository = buildProductRepositoryMock();
    const useCase = new GetRelatedProductsUseCase(productRepository);
    return { useCase, productRepository };
  };

  it('busca productos ACTIVE de la misma categoría sin repetir el actual', async () => {
    const { useCase, productRepository } = setup();
    productRepository.findBySlug.mockResolvedValue(
      buildProduct({
        slug: 'gabardina-clasica',
        category: ProductCategory.MEN,
      }),
    );

    await useCase.execute('gabardina-clasica');

    expect(productRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProductStatus.ACTIVE,
        category: ProductCategory.MEN,
        excludeSlug: 'gabardina-clasica',
        sort: ProductSort.FEATURED,
        pageSize: 4,
      }),
    );
  });

  it('devuelve [] si el producto no existe (sin consultar relacionados)', async () => {
    const { useCase, productRepository } = setup();

    await expect(useCase.execute('no-existe')).resolves.toEqual([]);
    expect(productRepository.findMany).not.toHaveBeenCalled();
  });

  it('devuelve [] si el producto es un borrador', async () => {
    const { useCase, productRepository } = setup();
    productRepository.findBySlug.mockResolvedValue(
      buildProduct({ status: ProductStatus.DRAFT }),
    );

    await expect(useCase.execute('abrigo-de-lana')).resolves.toEqual([]);
  });

  it(`limita el número de relacionados a ${MAX_RELATED_LIMIT}`, async () => {
    const { useCase, productRepository } = setup();
    productRepository.findBySlug.mockResolvedValue(buildProduct());

    await useCase.execute('abrigo-de-lana', 1000);

    expect(productRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: MAX_RELATED_LIMIT }),
    );
  });
});
