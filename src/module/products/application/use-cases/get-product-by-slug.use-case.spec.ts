import { ProductStatus } from '../../domain/entities/product.entity';
import { GetProductBySlugUseCase } from './get-product-by-slug.use-case';
import { buildProduct, buildProductRepositoryMock } from './test-helpers';

describe('GetProductBySlugUseCase', () => {
  const setup = () => {
    const productRepository = buildProductRepositoryMock();
    const useCase = new GetProductBySlugUseCase(productRepository);
    return { useCase, productRepository };
  };

  it('devuelve el producto publicado', async () => {
    const { useCase, productRepository } = setup();
    const product = buildProduct();
    productRepository.findBySlug.mockResolvedValue(product);

    await expect(useCase.execute('abrigo-de-lana')).resolves.toBe(product);
  });

  it('normaliza el slug (espacios y mayúsculas) antes de buscar', async () => {
    const { useCase, productRepository } = setup();

    await useCase.execute('  Abrigo-De-Lana ');

    expect(productRepository.findBySlug).toHaveBeenCalledWith('abrigo-de-lana');
  });

  it('devuelve null si no existe', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('no-existe')).resolves.toBeNull();
  });

  it('devuelve null si es un BORRADOR (para el público no existe)', async () => {
    const { useCase, productRepository } = setup();
    productRepository.findBySlug.mockResolvedValue(
      buildProduct({ status: ProductStatus.DRAFT }),
    );

    await expect(useCase.execute('abrigo-de-lana')).resolves.toBeNull();
  });
});
