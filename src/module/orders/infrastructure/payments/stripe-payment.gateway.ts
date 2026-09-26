import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { STORE_CURRENCY, stripeConfig } from '../../../../config';
import type { StripeConfig } from '../../../../config';
import type {
  CreatePaymentIntentParams,
  PaymentEvent,
  PaymentGateway,
  PaymentIntentSummary,
  PaymentStatus,
} from '../../domain/services/payment-gateway';

/**
 * Adaptador de Stripe para el puerto PaymentGateway.
 *
 * Es el ÚNICO archivo del backend que importa 'stripe'. Traduce los
 * conceptos de Stripe (sus 7 estados, sus tipos de evento...) a los pocos
 * que le importan a la tienda.
 */
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  private client: Stripe | null = null;

  constructor(
    @Inject(stripeConfig.KEY) private readonly config: StripeConfig,
  ) {}

  /**
   * Cliente "perezoso": se crea la primera vez que hace falta. Así la API
   * arranca aunque falte la clave (el catálogo, el login... siguen
   * funcionando) y solo el checkout avisa con un error claro.
   */
  private get stripe(): Stripe {
    if (!this.config.secretKey) {
      throw new ServiceUnavailableException(
        'Los pagos no están configurados (falta STRIPE_SECRET_KEY)',
      );
    }
    this.client ??= new Stripe(this.config.secretKey);
    return this.client;
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<{ id: string; clientSecret: string }> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: params.amount,
        currency: STORE_CURRENCY,
        // Solo tarjeta (Google Pay y Apple Pay cuentan como tarjeta). Debe
        // coincidir con `paymentMethodTypes` del <Elements> del frontend
        payment_method_types: ['card'],
        receipt_email: params.customerEmail,
        description: `Pedido ${params.orderNumber}`,
        // metadata: cuando llegue el webhook sabremos de qué pedido es
        metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
      },
      {
        // Idempotencia: si la petición se reintenta (red lenta, reinicio),
        // Stripe devuelve el MISMO PaymentIntent en vez de crear otro cobro
        idempotencyKey: `order-${params.orderId}`,
      },
    );
    if (!intent.client_secret) {
      throw new Error(`PaymentIntent ${intent.id} sin client_secret`);
    }
    return { id: intent.id, clientSecret: intent.client_secret };
  }

  async retrievePaymentIntent(id: string): Promise<PaymentIntentSummary> {
    const intent = await this.stripe.paymentIntents.retrieve(id);
    return {
      id: intent.id,
      status: toPaymentStatus(intent.status),
      amount: intent.amount,
    };
  }

  async cancelPaymentIntent(id: string): Promise<void> {
    await this.stripe.paymentIntents.cancel(id);
  }

  parseWebhookEvent(rawBody: Buffer, signature: string): PaymentEvent | null {
    if (!this.config.webhookSecret) {
      throw new ServiceUnavailableException(
        'Webhooks no configurados (falta STRIPE_WEBHOOK_SECRET)',
      );
    }
    // Verifica que el aviso lo firmó Stripe con NUESTRO secreto (y que es
    // reciente). Sin esto, cualquiera podría llamar a la URL diciendo
    // "el pedido X está pagado". Lanza si la firma no cuadra
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.webhookSecret,
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        return {
          type: 'payment_succeeded',
          paymentIntentId: event.data.object.id,
        };
      case 'payment_intent.canceled':
        return {
          type: 'payment_canceled',
          paymentIntentId: event.data.object.id,
        };
      case 'payment_intent.payment_failed':
        return {
          type: 'payment_failed',
          paymentIntentId: event.data.object.id,
        };
      default:
        // Stripe envía muchos más tipos; los que no usamos se ignoran
        return null;
    }
  }
}

/** Los 7 estados de Stripe → los 4 que le importan a la tienda. */
function toPaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'processing':
      return 'processing';
    case 'canceled':
      return 'canceled';
    default:
      // requires_payment_method, requires_action (3-D Secure)... = aún no pagado
      return 'requires_payment';
  }
}
