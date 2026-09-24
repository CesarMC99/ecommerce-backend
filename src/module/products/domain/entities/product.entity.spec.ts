import { buildProduct } from '../../application/use-cases/test-helpers';
import { NEW_PRODUCT_DAYS } from './product.entity';

describe('Product (reglas de negocio)', () => {
  describe('isOnSale / discountPercentage', () => {
    it('sin precio anterior no está rebajado ni tiene descuento', () => {
      const product = buildProduct({ compareAtPrice: null });

      expect(product.isOnSale()).toBe(false);
      expect(product.discountPercentage()).toBeNull();
    });

    it('calcula el descuento redondeado (240 € → 189 € = 21%)', () => {
      const product = buildProduct({ price: 18900, compareAtPrice: 24000 });

      expect(product.isOnSale()).toBe(true);
      expect(product.discountPercentage()).toBe(21);
    });

    it('un precio anterior MENOR o igual no cuenta como rebaja (dato erróneo)', () => {
      const product = buildProduct({ price: 18900, compareAtPrice: 18900 });

      expect(product.isOnSale()).toBe(false);
      expect(product.discountPercentage()).toBeNull();
    });
  });

  describe('isNew', () => {
    const now = new Date('2026-09-23T12:00:00Z');
    const daysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    it(`es nuevo si se publicó hace ${NEW_PRODUCT_DAYS} días o menos`, () => {
      expect(buildProduct({ publishedAt: daysAgo(0) }).isNew(now)).toBe(true);
      expect(
        buildProduct({ publishedAt: daysAgo(NEW_PRODUCT_DAYS) }).isNew(now),
      ).toBe(true);
    });

    it('deja de ser nuevo pasado el plazo', () => {
      const product = buildProduct({
        publishedAt: daysAgo(NEW_PRODUCT_DAYS + 1),
      });

      expect(product.isNew(now)).toBe(false);
    });

    it('una publicación programada en el futuro todavía no es "nueva"', () => {
      expect(buildProduct({ publishedAt: daysAgo(-3) }).isNew(now)).toBe(false);
    });
  });

  describe('mainImage', () => {
    it('la primera imagen es la principal', () => {
      const first = {
        publicId: 'ambar/products/a-1',
        alt: 'A',
        width: 1333,
        height: 2000,
      };
      const product = buildProduct({
        images: [first, { ...first, publicId: 'ambar/products/a-2' }],
      });

      expect(product.mainImage()).toEqual(first);
    });

    it('sin fotos devuelve null (la tienda muestra el placeholder)', () => {
      expect(buildProduct({ images: [] }).mainImage()).toBeNull();
    });
  });

  describe('isInStock', () => {
    it('hay stock si alguna talla tiene unidades', () => {
      const product = buildProduct({
        sizes: [
          { size: 'S', stock: 0 },
          { size: 'M', stock: 1 },
        ],
      });

      expect(product.isInStock()).toBe(true);
    });

    it('agotado si todas las tallas están a 0', () => {
      const product = buildProduct({
        sizes: [
          { size: 'S', stock: 0 },
          { size: 'M', stock: 0 },
        ],
      });

      expect(product.isInStock()).toBe(false);
    });
  });
});
