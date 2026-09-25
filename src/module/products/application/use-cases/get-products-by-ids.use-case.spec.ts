import { ProductStatus } from '../../domain/entities/product.entity';
import {
  GetProductsByIdsUseCase,
  MAX_PRODUCTS_BY_IDS,
} from './get-products-by-ids.use-case';
import { buildProduct, buildProductRepositoryMock } from './test-helpers';

describe('GetProductsByIdsUseCase', () => {
  const setup = () => {
    const productRepository = buildProductRepositoryMock();
    const useCase = new GetProductsByIdsUseCase(productRepository);
    return { useCase, productRepository };
  };

  it('devuelve los productos en el MISMO orden en que se piden', async () => {
    const { useCase, productRepository } = setup();
    // La base de datos los devuelve en otro orden
    productRepository.findByIds.mockResolvedValue([
      buildProduct({ id: 'b' }),
      buildProduct({ id: 'a' }),
    ]);

    const products = await useCase.execute(['a', 'b']);

    expect(products.map((product) => product.id)).toEqual(['a', 'b']);
  });

  it('omite los inexistentes y los borradores', async () => {
    const { useCase, productRepository } = setup();
    productRepository.findByIds.mockResolvedValue([
      buildProduct({ id: 'a' }),
      buildProduct({ id: 'draft', status: ProductStatus.DRAFT }),
    ]);

    const products = await useCase.execute(['a', 'draft', 'deleted']);

    expect(products.map((product) => product.id)).toEqual(['a']);
  });

  it(`quita duplicados y pide como mucho ${MAX_PRODUCTS_BY_IDS} ids`, async () => {
    const { useCase, productRepository } = setup();
    const ids = Array.from({ length: 150 }, (_, index) => `id-${index}`);
    // Se captura con su tipo lo que llega al repositorio (mock.calls es any)
    let requested: string[] = [];
    productRepository.findByIds.mockImplementation((received: string[]) => {
      requested = received;
      return Promise.resolve([]);
    });

    await useCase.execute([...ids, 'id-0']);

    expect(requested).toHaveLength(MAX_PRODUCTS_BY_IDS);
  });
});
