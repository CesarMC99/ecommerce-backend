import { Order, OrderStatus } from '../../domain/entities/order.entity';
import { OrderMailer } from '../services/order-mailer.service';
import {
  escapeHtml,
  renderOrderConfirmationEmail,
} from './order-confirmation.email';

const buildOrder = (overrides: { fullName?: string; shipping?: number } = {}) =>
  new Order(
    'order-1',
    'AMB-7K3F9Q2M',
    'user-1',
    'lucia@ambar.test',
    [
      {
        productId: 'coat',
        slug: 'abrigo-de-lana',
        name: 'Abrigo de lana',
        colorName: 'Camel',
        size: 'M',
        imagePublicId: 'ambar/products/abrigo-1',
        unitPrice: 18900,
        quantity: 1,
        lineTotal: 18900,
      },
    ],
    18900,
    overrides.shipping ?? 0,
    18900 + (overrides.shipping ?? 0),
    {
      fullName: overrides.fullName ?? 'Lucía García',
      phone: '+525512345678',
      line1: 'Av. Reforma 222',
      city: 'Guadalajara',
      country: 'MX',
    },
    OrderStatus.PAID,
    'pi_1',
    new Date('2026-09-25T10:00:00Z'),
    new Date('2026-09-25T10:30:00Z'),
    new Date('2026-09-25T10:05:00Z'),
  );

const context = {
  orderUrl: 'http://localhost:4000/checkout/confirmacion?pedido=order-1',
  imageUrl: (publicId: string) => `https://img.test/${publicId}`,
};

describe('renderOrderConfirmationEmail', () => {
  it('incluye número, productos, total, dirección y enlace', () => {
    const email = renderOrderConfirmationEmail(buildOrder(), context);

    expect(email.subject).toBe('Pedido AMB-7K3F9Q2M confirmado');
    for (const part of [
      'Lucía',
      'Abrigo de lana',
      'Talla M',
      '189,00',
      'Gratis',
      'Guadalajara, México',
      'https://img.test/ambar/products/abrigo-1',
      context.orderUrl,
    ]) {
      expect(email.html).toContain(part);
    }
    expect(email.text).toContain('Total pagado: 189,00');
  });

  it('muestra el coste de envío cuando no es gratis', () => {
    const email = renderOrderConfirmationEmail(
      buildOrder({ shipping: 495 }),
      context,
    );
    expect(email.html).toContain('4,95');
  });

  it('escapa el texto del cliente (no se puede inyectar HTML)', () => {
    const email = renderOrderConfirmationEmail(
      buildOrder({ fullName: '<script>alert(1)</script> Pérez' }),
      context,
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('escapeHtml neutraliza los caracteres peligrosos', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('OrderMailer', () => {
  const setup = (send: jest.Mock) =>
    new OrderMailer(
      { send },
      { frontendUrl: 'http://localhost:4000' } as never,
      { cloudName: 'demo' } as never,
    );

  it('envía al correo de contacto del pedido, con clave de idempotencia', async () => {
    const send = jest.fn().mockResolvedValue(undefined);

    await setup(send).sendOrderConfirmation(buildOrder());

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'lucia@ambar.test',
        subject: 'Pedido AMB-7K3F9Q2M confirmado',
        idempotencyKey: 'order-confirmation/order-1',
      }),
    );
    const [message] = send.mock.calls[0] as [{ html: string }];
    expect(message.html).toContain(
      'https://res.cloudinary.com/demo/image/upload/',
    );
  });

  it('si el proveedor falla, NO lanza (el pedido sigue pagado)', async () => {
    const send = jest.fn().mockRejectedValue(new Error('Resend caído'));

    await expect(
      setup(send).sendOrderConfirmation(buildOrder()),
    ).resolves.toBeUndefined();
  });
});
