import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  buildProduct,
  buildProductRepositoryMock,
} from '../../../products/application/use-cases/test-helpers';
import { Cart } from '../../domain/entities/cart.entity';
import { CartPricer } from '../services/cart-pricer.service';
import { AddCartItemUseCase } from './add-cart-item.use-case';
import { MergeCartUseCase } from './merge-cart.use-case';
import { QuoteCartUseCase } from './quote-cart.use-case';

// Mismo patrón que auth: clases instanciadas a mano con mocks de objetos
// planos. Sin base de datos ni Nest: los tests prueban SOLO las reglas
describe('Use-cases del carrito', () => {
  const shirt = buildProduct({
    id: 'shirt',
    price: 5900,
    compareAtPrice: null,
    sizes: [
      { size: 'M', stock: 5 },
      { size: 'L', stock: 0 },
    ],
  });

  const setup = () => {
    const productRepository = buildProductRepositoryMock();
    // findByIds devuelve SOLO los productos cuyos ids se piden
    productRepository.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve([shirt].filter((product) => ids.includes(product.id))),
    );
    const cartRepository = {
      findByUserId: jest.fn().mockResolvedValue(null),
      // save devuelve el mismo carrito que recibe (como haría la BD)
      save: jest.fn((cart: Cart) => Promise.resolve(cart)),
    };
    const cartPricer = new CartPricer(productRepository);
    return { productRepository, cartRepository, cartPricer };
  };

  describe('AddCartItemUseCase', () => {
    it('añade una talla con stock y devuelve el carrito con precios', async () => {
      const { productRepository, cartRepository, cartPricer } = setup();
      const useCase = new AddCartItemUseCase(
        cartRepository,
        productRepository,
        cartPricer,
      );

      const cart = await useCase.execute('user-1', {
        productId: 'shirt',
        size: 'M',
        quantity: 2,
      });

      expect(cartRepository.save).toHaveBeenCalled();
      expect(cart.subtotal).toBe(11800);
    });

    it('rechaza un producto que no existe', async () => {
      const { productRepository, cartRepository, cartPricer } = setup();
      const useCase = new AddCartItemUseCase(
        cartRepository,
        productRepository,
        cartPricer,
      );

      await expect(
        useCase.execute('user-1', {
          productId: 'nope',
          size: 'M',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(cartRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza una talla agotada con un mensaje claro', async () => {
      const { productRepository, cartRepository, cartPricer } = setup();
      const useCase = new AddCartItemUseCase(
        cartRepository,
        productRepository,
        cartPricer,
      );

      await expect(
        useCase.execute('user-1', {
          productId: 'shirt',
          size: 'L',
          quantity: 1,
        }),
      ).rejects.toThrow(new BadRequestException('Esa talla está agotada'));
    });
  });

  describe('MergeCartUseCase', () => {
    it('fusiona SOLO las líneas de invitado que se pueden comprar', async () => {
      const { cartRepository, cartPricer } = setup();
      cartRepository.findByUserId.mockResolvedValue(
        Cart.empty('user-1').addItem({
          productId: 'shirt',
          size: 'M',
          quantity: 1,
        }),
      );
      const useCase = new MergeCartUseCase(cartRepository, cartPricer);

      await useCase.execute('user-1', [
        { productId: 'shirt', size: 'M', quantity: 2 }, // se suma
        { productId: 'shirt', size: 'L', quantity: 1 }, // agotada → fuera
        { productId: 'gone', size: 'M', quantity: 1 }, // no existe → fuera
      ]);

      const savedCart = cartRepository.save.mock.calls[0][0];
      expect(savedCart.items).toEqual([
        { productId: 'shirt', size: 'M', quantity: 3 },
      ]);
    });
  });

  describe('QuoteCartUseCase', () => {
    it('normaliza un carrito de invitado manipulado (líneas repetidas)', async () => {
      const { cartPricer } = setup();
      const useCase = new QuoteCartUseCase(cartPricer);

      const cart = await useCase.execute([
        { productId: 'shirt', size: 'M', quantity: 1 },
        { productId: 'shirt', size: 'M', quantity: 1 },
      ]);

      expect(cart.lines).toHaveLength(1);
      expect(cart.lines[0].quantity).toBe(2);
    });
  });
});
