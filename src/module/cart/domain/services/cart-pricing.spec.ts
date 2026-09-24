import { buildProduct } from '../../../products/application/use-cases/test-helpers';
import {
  Product,
  ProductStatus,
} from '../../../products/domain/entities/product.entity';
import {
  FREE_SHIPPING_THRESHOLD,
  priceCart,
  SHIPPING_COST,
} from './cart-pricing';

const byId = (...products: Product[]) =>
  new Map(products.map((product) => [product.id, product]));

describe('priceCart (reglas de precio)', () => {
  // Abrigo rebajado: 189 € (antes 240 €), talla M con 3 unidades
  const coat = buildProduct({
    id: 'coat',
    price: 18900,
    compareAtPrice: 24000,
    sizes: [
      { size: 'M', stock: 3 },
      { size: 'L', stock: 0 },
    ],
  });
  // Camiseta: 29 €, sin rebaja
  const tee = buildProduct({
    id: 'tee',
    price: 2900,
    compareAtPrice: null,
    sizes: [{ size: 'S', stock: 10 }],
  });

  it('calcula subtotal, ahorro y total con los precios DEL PRODUCTO', () => {
    const cart = priceCart(
      [{ productId: 'coat', size: 'M', quantity: 2 }],
      byId(coat),
    );

    expect(cart.subtotal).toBe(37800); // 189 € × 2
    expect(cart.savings).toBe(10200); // (240 − 189) × 2
    expect(cart.shipping).toBe(0); // supera 50 €
    expect(cart.total).toBe(37800);
    expect(cart.itemCount).toBe(2);
  });

  it(`cobra ${SHIPPING_COST / 100} € de envío por debajo de ${FREE_SHIPPING_THRESHOLD / 100} €`, () => {
    const cart = priceCart(
      [{ productId: 'tee', size: 'S', quantity: 1 }],
      byId(tee),
    );

    expect(cart.shipping).toBe(SHIPPING_COST);
    expect(cart.total).toBe(2900 + SHIPPING_COST);
    expect(cart.amountToFreeShipping).toBe(FREE_SHIPPING_THRESHOLD - 2900);
  });

  it('el envío es gratis justo AL LLEGAR al umbral (no hace falta superarlo)', () => {
    const exact = buildProduct({
      id: 'exact',
      price: FREE_SHIPPING_THRESHOLD,
      sizes: [{ size: 'M', stock: 1 }],
    });

    const cart = priceCart(
      [{ productId: 'exact', size: 'M', quantity: 1 }],
      byId(exact),
    );

    expect(cart.shipping).toBe(0);
    expect(cart.amountToFreeShipping).toBe(0);
  });

  it('un carrito vacío no cobra envío', () => {
    const cart = priceCart([], byId());

    expect(cart.total).toBe(0);
    expect(cart.shipping).toBe(0);
  });

  it('limita la cantidad al stock disponible de la talla', () => {
    const cart = priceCart(
      [{ productId: 'coat', size: 'M', quantity: 8 }],
      byId(coat),
    );

    expect(cart.lines[0].quantity).toBe(3);
    expect(cart.lines[0].maxQuantity).toBe(3);
  });

  it('las líneas NO disponibles se devuelven pero NO suman', () => {
    const draft = buildProduct({ id: 'draft', status: ProductStatus.DRAFT });

    const cart = priceCart(
      [
        { productId: 'tee', size: 'S', quantity: 1 },
        { productId: 'coat', size: 'L', quantity: 1 }, // agotada
        { productId: 'coat', size: 'XXL', quantity: 1 }, // no existe
        { productId: 'draft', size: 'S', quantity: 1 }, // borrador
        { productId: 'deleted', size: 'M', quantity: 1 }, // borrado
      ],
      byId(coat, tee, draft),
    );

    expect(cart.lines.map((line) => line.unavailableReason)).toEqual([
      null,
      'OUT_OF_STOCK',
      'SIZE_NOT_FOUND',
      'PRODUCT_UNAVAILABLE',
      'PRODUCT_NOT_FOUND',
    ]);
    expect(cart.subtotal).toBe(2900); // solo la camiseta
    expect(cart.itemCount).toBe(1);
  });
});
