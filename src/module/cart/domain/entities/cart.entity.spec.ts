import { Cart, MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from './cart.entity';

describe('Cart (reglas del carrito)', () => {
  const coatM = { productId: 'coat', size: 'M', quantity: 1 };

  it('añadir la MISMA línea (producto + talla) suma cantidades, no duplica', () => {
    const cart = Cart.empty('user-1').addItem(coatM).addItem(coatM);

    expect(cart.items).toEqual([{ ...coatM, quantity: 2 }]);
  });

  it('la misma prenda en OTRA talla es una línea distinta', () => {
    const cart = Cart.empty('user-1')
      .addItem(coatM)
      .addItem({ ...coatM, size: 'L' });

    expect(cart.items).toHaveLength(2);
  });

  it(`nunca supera ${MAX_QUANTITY_PER_LINE} unidades por línea`, () => {
    const cart = Cart.empty('user-1')
      .addItem({ ...coatM, quantity: 8 })
      .addItem({ ...coatM, quantity: 8 });

    expect(cart.items[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it(`no admite más de ${MAX_CART_LINES} líneas distintas`, () => {
    let cart = Cart.empty('user-1');
    for (let i = 0; i < MAX_CART_LINES + 5; i++) {
      cart = cart.addItem({ productId: `p-${i}`, size: 'M', quantity: 1 });
    }

    expect(cart.items).toHaveLength(MAX_CART_LINES);
  });

  it('setQuantity fija la cantidad y con 0 elimina la línea', () => {
    const cart = Cart.empty('user-1').addItem(coatM);

    expect(cart.setQuantity(coatM, 4).items[0].quantity).toBe(4);
    expect(cart.setQuantity(coatM, 0).items).toEqual([]);
  });

  it('merge suma el carrito de invitado al de la cuenta', () => {
    const account = Cart.empty('user-1').addItem(coatM);

    const merged = account.merge([
      { ...coatM, quantity: 2 },
      { productId: 'shirt', size: 'S', quantity: 1 },
    ]);

    expect(merged.items).toEqual([
      { ...coatM, quantity: 3 },
      { productId: 'shirt', size: 'S', quantity: 1 },
    ]);
  });

  it('es inmutable: las operaciones no modifican el carrito original', () => {
    const original = Cart.empty('user-1').addItem(coatM);

    original.addItem(coatM);
    original.clear();

    expect(original.items).toEqual([coatM]);
  });

  it('itemCount suma las unidades de todas las líneas', () => {
    const cart = Cart.empty('user-1')
      .addItem({ ...coatM, quantity: 2 })
      .addItem({ productId: 'shirt', size: 'S', quantity: 3 });

    expect(cart.itemCount()).toBe(5);
  });
});
