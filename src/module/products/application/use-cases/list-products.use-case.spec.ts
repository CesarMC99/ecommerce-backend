import {
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';
import { ProductSort } from '../../domain/repositories/product.repository';
import {
  DEFAULT_PAGE_SIZE,
  ListProductsUseCase,
  MAX_PAGE_SIZE,
} from './list-products.use-case';
import { buildProduct, buildProductRepositoryMock } from './test-helpers';

describe('ListProductsUseCase', () => {
  const setup = () => {
    const productRepository = buildProductRepositoryMock();
    const useCase = new ListProductsUseCase(productRepository);
    return { useCase, productRepository };
  };

  it('sin argumentos: página 1, tamaño por defecto y orden FEATURED', async () => {
    const { useCase, productRepository } = setup();

    await useCase.execute();

    expect(productRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        sort: ProductSort.FEATURED,
      }),
    );
  });

  it('SIEMPRE filtra por productos ACTIVE (los borradores nunca se ven)', async () => {
    const { useCase, productRepository } = setup();

    await useCase.execute({ category: ProductCategory.MEN });

    expect(productRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProductStatus.ACTIVE,
        category: ProductCategory.MEN,
      }),
    );
  });

  it(`limita el tamaño de página a ${MAX_PAGE_SIZE} (protege al servidor)`, async () => {
    const { useCase, productRepository } = setup();

    await useCase.execute({ pageSize: 1_000_000 });

    expect(productRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: MAX_PAGE_SIZE }),
    );
  });

  it('corrige página y tamaño inválidos al mínimo permitido', async () => {
    const { useCase, productRepository } = setup();

    await useCase.execute({ page: -5, pageSize: 0 });

    expect(productRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 1 }),
    );
  });

  it('calcula el total de páginas redondeando hacia arriba', async () => {
    const { useCase, productRepository } = setup();
    productRepository.findMany.mockResolvedValue({
      items: [buildProduct()],
      totalCount: 25,
    });

    const result = await useCase.execute({ pageSize: 12 });

    expect(result.totalPages).toBe(3); // 12 + 12 + 1
    expect(result.totalCount).toBe(25);
  });

  it('sin resultados devuelve 0 páginas', async () => {
    const { useCase } = setup();

    const result = await useCase.execute();

    expect(result.totalPages).toBe(0);
    expect(result.items).toEqual([]);
  });
});
