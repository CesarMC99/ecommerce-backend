import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CartPricer } from '../../../cart/application/services/cart-pricer.service';
import { Cart } from '../../../cart/domain/entities/cart.entity';
import {
  buildProduct,
  buildProductRepositoryMock,
} from '../../../products/application/use-cases/test-helpers';
import type { LocationDirectory } from '../../../locations/domain/location-directory';
import { normalizeText } from '../../../locations/domain/normalize-text';
import {
  Order,
  OrderStatus,
  type ShippingAddress,
} from '../../domain/entities/order.entity';
import type {
  CreateOrderData,
  OrderRepository,
} from '../../domain/repositories/order.repository';
import type { PaymentStatus } from '../../domain/services/payment-gateway';
import { OrderLifecycleService } from '../services/order-lifecycle.service';
import type { OrderMailer } from '../services/order-mailer.service';
import { GetOrderUseCase } from './get-order.use-case';
import { HandlePaymentEventUseCase } from './handle-payment-event.use-case';
import { StartCheckoutUseCase } from './start-checkout.use-case';

/**
 * Repositorio de pedidos EN MEMORIA: se comporta como el real (incluidas
 * las transiciones "solo si sigue pendiente"), así los tests comprueban
 * de verdad que nada se ejecuta dos veces.
 */
class InMemoryOrderRepository implements OrderRepository {
  orders = new Map<string, Order>();
  private nextId = 1;

  create(data: CreateOrderData): Promise<Order> {
    const order = new Order(
      `order-${this.nextId++}`,
      data.number,
      data.userId,
      data.email,
      data.lines,
      data.subtotal,
      data.shipping,
      data.total,
      data.shippingAddress,
      OrderStatus.PENDING_PAYMENT,
      null,
      new Date(),
      data.expiresAt,
      null,
    );
    this.orders.set(order.id, order);
    return Promise.resolve(order);
  }

  findById(id: string) {
    return Promise.resolve(this.orders.get(id) ?? null);
  }

  findByPaymentIntentId(paymentIntentId: string) {
    const found = [...this.orders.values()].find(
      (order) => order.paymentIntentId === paymentIntentId,
    );
    return Promise.resolve(found ?? null);
  }

  findPendingByUser(userId: string) {
    const found = [...this.orders.values()].find(
      (order) => order.userId === userId && order.isPending(),
    );
    return Promise.resolve(found ?? null);
  }

  findExpiredPending(now: Date) {
    return Promise.resolve(
      [...this.orders.values()].filter((order) => order.isExpired(now)),
    );
  }

  findByUser(userId: string) {
    return Promise.resolve(
      [...this.orders.values()].filter((order) => order.userId === userId),
    );
  }

  setPaymentIntentId(orderId: string, paymentIntentId: string) {
    const order = this.orders.get(orderId)!;
    this.orders.set(orderId, order.withPaymentIntent(paymentIntentId));
    return Promise.resolve();
  }

  markPaidIfPending(orderId: string, paidAt: Date) {
    return Promise.resolve(this.transition(orderId, OrderStatus.PAID, paidAt));
  }

  cancelIfPending(orderId: string) {
    return Promise.resolve(
      this.transition(orderId, OrderStatus.CANCELLED, null),
    );
  }

  private transition(
    orderId: string,
    status: OrderStatus,
    paidAt: Date | null,
  ): Order | null {
    const order = this.orders.get(orderId);
    if (!order?.isPending()) return null;
    const updated = new Order(
      order.id,
      order.number,
      order.userId,
      order.email,
      order.lines,
      order.subtotal,
      order.shipping,
      order.total,
      order.shippingAddress,
      status,
      order.paymentIntentId,
      order.createdAt,
      order.expiresAt,
      paidAt,
    );
    this.orders.set(orderId, updated);
    return updated;
  }
}

// Tal como la escribe el cliente: ciudad sin tilde y teléfono con espacios
const address: ShippingAddress = {
  fullName: 'Lucía García',
  phone: '612 345 678',
  line1: 'Calle Mayor 1, 3º B',
  city: 'malaga',
  country: 'ES',
};

/** Directorio falso: solo España, con Málaga y Madrid. */
const locationDirectory: LocationDirectory = {
  listCountries: () => [{ code: 'ES', name: 'España', dialCode: '34' }],
  findCountry: (code) =>
    code === 'ES' ? { code: 'ES', name: 'España', dialCode: '34' } : null,
  searchCities: () => [],
  findCity: (country, name) => {
    const found = ['Málaga', 'Madrid'].find(
      (city) => normalizeText(city) === normalizeText(name),
    );
    return country === 'ES' && found
      ? { name: found, countryCode: 'ES' }
      : null;
  },
};

describe('Checkout y pedidos', () => {
  const coat = buildProduct({
    id: 'coat',
    name: 'Abrigo de lana',
    price: 18900,
    sizes: [{ size: 'M', stock: 3 }],
  });
  const shirt = buildProduct({
    id: 'shirt',
    slug: 'camisa-de-lino',
    name: 'Camisa de lino',
    price: 2900,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'L', stock: 0 },
    ],
  });

  const setup = (
    cartItems = [{ productId: 'coat', size: 'M', quantity: 1 }],
  ) => {
    const productRepository = buildProductRepositoryMock();
    productRepository.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(
        [coat, shirt].filter((product) => ids.includes(product.id)),
      ),
    );

    let savedCart = new Cart('cart-1', 'user-1', cartItems);
    const cartRepository = {
      findByUserId: jest.fn(() => Promise.resolve(savedCart)),
      save: jest.fn((cart: Cart) => {
        savedCart = cart;
        return Promise.resolve(cart);
      }),
    };

    // Pasarela falsa: el test decide en qué estado está el cobro
    let paymentStatus: PaymentStatus = 'requires_payment';
    let paidAmount: number | null = null;
    const paymentGateway = {
      createPaymentIntent: jest.fn(({ amount }: { amount: number }) => {
        paidAmount = amount;
        return Promise.resolve({ id: 'pi_1', clientSecret: 'pi_1_secret' });
      }),
      retrievePaymentIntent: jest.fn((id: string) =>
        Promise.resolve({ id, status: paymentStatus, amount: paidAmount ?? 0 }),
      ),
      cancelPaymentIntent: jest.fn(() => {
        paymentStatus = 'canceled';
        return Promise.resolve();
      }),
      parseWebhookEvent: jest.fn(),
    };

    const orderRepository = new InMemoryOrderRepository();
    // Mailer falso: comprobamos CUÁNDO se envía, no el correo en sí
    const orderMailer = {
      sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    };
    const lifecycle = new OrderLifecycleService(
      orderRepository,
      productRepository,
      cartRepository,
      paymentGateway,
      orderMailer as unknown as OrderMailer,
    );
    const startCheckout = new StartCheckoutUseCase(
      cartRepository,
      productRepository,
      orderRepository,
      paymentGateway,
      locationDirectory,
      new CartPricer(productRepository),
      lifecycle,
    );
    const start = (overrides: Partial<ShippingAddress> = {}) =>
      startCheckout.execute({
        userId: 'user-1',
        email: 'otro-correo@ambar.test',
        shippingAddress: { ...address, ...overrides },
      });

    return {
      productRepository,
      cartRepository,
      paymentGateway,
      orderRepository,
      orderMailer,
      lifecycle,
      start,
      getCart: () => savedCart,
      setPaymentStatus: (status: PaymentStatus) => (paymentStatus = status),
      setPaidAmount: (amount: number) => (paidAmount = amount),
    };
  };

  describe('StartCheckoutUseCase', () => {
    it('crea el pedido con precios del backend, reserva stock y prepara el cobro', async () => {
      const { start, productRepository, paymentGateway } = setup();

      const session = await start();

      expect(session.clientSecret).toBe('pi_1_secret');
      expect(session.order.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(session.order.paymentIntentId).toBe('pi_1');
      // 189 € ≥ 50 € → envío gratis
      expect(session.order.total).toBe(18900);
      expect(session.order.lines[0]).toMatchObject({
        name: 'Abrigo de lana',
        colorName: 'Camel',
        unitPrice: 18900,
      });
      expect(session.order.number).toMatch(/^AMB-[2-9A-Z]{8}$/);
      expect(productRepository.reserveStock).toHaveBeenCalledWith(
        'coat',
        'M',
        1,
      );
      expect(paymentGateway.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 18900 }),
      );
    });

    it('normaliza la dirección y usa el correo de contacto indicado', async () => {
      const { start, paymentGateway } = setup();

      const { order } = await start();

      expect(order.shippingAddress).toMatchObject({
        city: 'Málaga',
        phone: '+34612345678',
      });
      expect(order.email).toBe('otro-correo@ambar.test');
      expect(paymentGateway.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ customerEmail: 'otro-correo@ambar.test' }),
      );
    });

    it.each([
      ['un país al que no se envía', { country: 'JP' }, 'no enviamos'],
      [
        'una ciudad fuera del listado',
        { city: 'Gotham' },
        'ciudad de la lista',
      ],
      ['un teléfono no válido', { phone: '123' }, 'teléfono no es válido'],
      ['un teléfono de otro país', { phone: '+52 55 1234 5678' }, 'teléfono'],
    ])('rechaza %s sin reservar nada', async (_, overrides, message) => {
      const { start, productRepository, orderRepository } = setup();

      // Con un texto, toThrow comprueba que el mensaje lo CONTIENE
      await expect(start(overrides)).rejects.toThrow(BadRequestException);
      await expect(start(overrides)).rejects.toThrow(message);
      expect(productRepository.reserveStock).not.toHaveBeenCalled();
      expect(orderRepository.orders.size).toBe(0);
    });

    it('suma el envío si no llega a 50 €', async () => {
      const { start } = setup([{ productId: 'shirt', size: 'S', quantity: 1 }]);
      const session = await start();
      expect(session.order.shipping).toBe(495);
      expect(session.order.total).toBe(2900 + 495);
    });

    it('rechaza un carrito vacío', async () => {
      const { start } = setup([]);
      await expect(start()).rejects.toThrow(BadRequestException);
    });

    it('rechaza el pago si alguna línea no está disponible, sin reservar nada', async () => {
      const { start, productRepository } = setup([
        { productId: 'coat', size: 'M', quantity: 1 },
        { productId: 'shirt', size: 'L', quantity: 1 }, // agotada
      ]);

      await expect(start()).rejects.toThrow(ConflictException);
      expect(productRepository.reserveStock).not.toHaveBeenCalled();
    });

    it('si una reserva falla, devuelve las anteriores y no crea el pedido', async () => {
      const { start, productRepository, orderRepository } = setup([
        { productId: 'coat', size: 'M', quantity: 1 },
        { productId: 'shirt', size: 'S', quantity: 2 },
      ]);
      // Alguien compró las camisas un segundo antes
      productRepository.reserveStock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(start()).rejects.toThrow(ConflictException);
      expect(productRepository.releaseStock).toHaveBeenCalledWith(
        'coat',
        'M',
        1,
      );
      expect(orderRepository.orders.size).toBe(0);
    });

    it('si Stripe falla, cancela el pedido y devuelve el stock', async () => {
      const { start, paymentGateway, productRepository, orderRepository } =
        setup();
      paymentGateway.createPaymentIntent.mockRejectedValueOnce(
        new Error('Stripe caído'),
      );

      await expect(start()).rejects.toThrow('Stripe caído');
      const [order] = orderRepository.orders.values();
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(productRepository.releaseStock).toHaveBeenCalledWith(
        'coat',
        'M',
        1,
      );
    });

    it('cierra el pedido pendiente anterior antes de crear otro', async () => {
      const { start, paymentGateway, productRepository, orderRepository } =
        setup();
      const first = await start();

      await start();

      expect(paymentGateway.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
      expect(orderRepository.orders.get(first.order.id)?.status).toBe(
        OrderStatus.CANCELLED,
      );
      expect(productRepository.releaseStock).toHaveBeenCalledTimes(1);
    });
  });

  describe('OrderLifecycleService', () => {
    it('al confirmarse el pago marca PAGADO y quita del carrito solo lo comprado', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      // Mientras pagaba, añadió una camisa en otra pestaña
      await ctx.cartRepository.save(
        ctx.getCart().addItem({ productId: 'shirt', size: 'S', quantity: 1 }),
      );
      ctx.setPaymentStatus('succeeded');

      const paid = await ctx.lifecycle.syncWithPayment(order);

      expect(paid.status).toBe(OrderStatus.PAID);
      expect(paid.paidAt).toBeInstanceOf(Date);
      expect(ctx.getCart().items).toEqual([
        { productId: 'shirt', size: 'S', quantity: 1 },
      ]);
    });

    it('es idempotente: webhook y cliente a la vez no repiten el trabajo', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      ctx.setPaymentStatus('succeeded');
      ctx.cartRepository.save.mockClear();

      await Promise.all([
        ctx.lifecycle.syncWithPayment(order),
        ctx.lifecycle.syncWithPayment(order),
      ]);

      expect(ctx.cartRepository.save).toHaveBeenCalledTimes(1);
      // Y el correo de confirmación sale UNA sola vez
      expect(ctx.orderMailer.sendOrderConfirmation).toHaveBeenCalledTimes(1);
      expect(ctx.orderMailer.sendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PAID }),
      );
    });

    it('no envía correo de confirmación si el pedido se cancela', async () => {
      const ctx = setup();
      const { order } = await ctx.start();

      await ctx.lifecycle.close(order);

      expect(ctx.orderMailer.sendOrderConfirmation).not.toHaveBeenCalled();
    });

    it('no marca pagado si el importe cobrado no coincide', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      ctx.setPaymentStatus('succeeded');
      ctx.setPaidAmount(100);

      const result = await ctx.lifecycle.syncWithPayment(order);

      expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('al caducar sin pagar anula el cobro y devuelve el stock', async () => {
      const ctx = setup();
      const { order } = await ctx.start();

      const closed = await ctx.lifecycle.close(order);

      expect(closed.status).toBe(OrderStatus.CANCELLED);
      expect(ctx.paymentGateway.cancelPaymentIntent).toHaveBeenCalledWith(
        'pi_1',
      );
      expect(ctx.productRepository.releaseStock).toHaveBeenCalledWith(
        'coat',
        'M',
        1,
      );
    });

    it('si pagó justo antes de caducar, el pedido queda PAGADO', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      ctx.setPaymentStatus('succeeded');

      const closed = await ctx.lifecycle.close(order);

      expect(closed.status).toBe(OrderStatus.PAID);
      expect(ctx.paymentGateway.cancelPaymentIntent).not.toHaveBeenCalled();
      expect(ctx.productRepository.releaseStock).not.toHaveBeenCalled();
    });

    it('no cancela un pago que el banco aún está procesando', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      ctx.setPaymentStatus('processing');

      const closed = await ctx.lifecycle.close(order);

      expect(closed.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(ctx.paymentGateway.cancelPaymentIntent).not.toHaveBeenCalled();
    });

    it('el barrido solo cierra los pedidos cuyo plazo venció', async () => {
      const ctx = setup();
      const { order } = await ctx.start();

      expect(await ctx.lifecycle.closeExpired(new Date())).toBe(0);

      const later = new Date(order.expiresAt.getTime() + 1000);
      expect(await ctx.lifecycle.closeExpired(later)).toBe(1);
      expect(ctx.orderRepository.orders.get(order.id)?.status).toBe(
        OrderStatus.CANCELLED,
      );
    });
  });

  describe('GetOrderUseCase', () => {
    it('no deja ver el pedido de otra persona', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      const useCase = new GetOrderUseCase(ctx.orderRepository);

      await expect(useCase.execute('user-1', order.id)).resolves.toBeDefined();
      await expect(useCase.execute('intruso', order.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('HandlePaymentEventUseCase', () => {
    it('ignora avisos de cobros que no son de ningún pedido', async () => {
      const ctx = setup();
      const useCase = new HandlePaymentEventUseCase(
        ctx.orderRepository,
        ctx.lifecycle,
      );

      await expect(
        useCase.execute({ type: 'payment_succeeded', paymentIntentId: 'pi_x' }),
      ).resolves.toBeUndefined();
    });

    it('un cobro cancelado en Stripe cancela el pedido y devuelve el stock', async () => {
      const ctx = setup();
      const { order } = await ctx.start();
      const useCase = new HandlePaymentEventUseCase(
        ctx.orderRepository,
        ctx.lifecycle,
      );

      await useCase.execute({
        type: 'payment_canceled',
        paymentIntentId: 'pi_1',
      });

      expect(ctx.orderRepository.orders.get(order.id)?.status).toBe(
        OrderStatus.CANCELLED,
      );
      expect(ctx.productRepository.releaseStock).toHaveBeenCalled();
    });
  });
});
