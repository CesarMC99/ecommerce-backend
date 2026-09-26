import {
  Product,
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';

/**
 * Builder de productos para los tests (mismo patrón que buildUser en auth):
 * crea un producto válido por defecto y cada test cambia SOLO lo que le
 * importa. Así el test se lee como "un producto rebajado", no como una
 * lista de 17 argumentos.
 */
export const buildProduct = (overrides: Partial<Product> = {}): Product =>
  new Product(
    overrides.id ?? 'product-1',
    overrides.slug ?? 'abrigo-de-lana',
    overrides.name ?? 'Abrigo de lana',
    overrides.description ?? 'Abrigo de lana virgen',
    overrides.details ?? ['80% lana, 20% poliamida', 'Lavado en seco'],
    overrides.price ?? 18900,
    'compareAtPrice' in overrides
      ? (overrides.compareAtPrice as number | null)
      : null,
    overrides.category ?? ProductCategory.WOMEN,
    overrides.type ?? 'Abrigos',
    overrides.color ?? { name: 'Camel', hex: '#c8a06a' },
    overrides.sizes ?? [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 0 },
    ],
    overrides.images ?? [],
    overrides.rating ?? 4.8,
    overrides.reviewsCount ?? 128,
    overrides.isFeatured ?? false,
    overrides.status ?? ProductStatus.ACTIVE,
    overrides.publishedAt ?? new Date('2026-01-01'),
    overrides.createdAt ?? new Date('2026-01-01'),
  );

/** Mock del ProductRepository con todos sus métodos como jest.fn(). */
export const buildProductRepositoryMock = () => ({
  findMany: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  findBySlug: jest.fn().mockResolvedValue(null),
  findByIds: jest.fn().mockResolvedValue([]),
  reserveStock: jest.fn().mockResolvedValue(true),
  releaseStock: jest.fn().mockResolvedValue(undefined),
  findFacets: jest
    .fn()
    .mockResolvedValue({ colors: [], sizes: [], minPrice: 0, maxPrice: 0 }),
});
