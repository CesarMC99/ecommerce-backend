/**
 * Puerto de la pasarela de pago.
 *
 * El dominio y los use-cases hablan con ESTA interfaz, nunca con Stripe
 * directamente. Stripe es un detalle de infraestructura: cambiar a otra
 * pasarela (o usar una falsa en los tests) es escribir otra implementación,
 * sin tocar las reglas del checkout (la "D" de SOLID).
 */

/** Estado del cobro traducido a lo que le importa a la tienda */
export type PaymentStatus =
  | 'succeeded' // cobrado
  | 'processing' // el banco aún no ha respondido (p. ej. transferencias)
  | 'requires_payment' // falta que el cliente pague (o falló y puede reintentar)
  | 'canceled';

export interface PaymentIntentSummary {
  id: string;
  status: PaymentStatus;
  /** Importe en céntimos */
  amount: number;
}

export interface CreatePaymentIntentParams {
  /** Importe en céntimos, calculado SIEMPRE por el backend */
  amount: number;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
}

/** Aviso de la pasarela ya verificado y traducido (webhook). */
export interface PaymentEvent {
  type: 'payment_succeeded' | 'payment_canceled' | 'payment_failed';
  paymentIntentId: string;
}

export interface PaymentGateway {
  /** Crea el intento de cobro; el clientSecret se lo lleva el navegador */
  createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<{ id: string; clientSecret: string }>;
  retrievePaymentIntent(id: string): Promise<PaymentIntentSummary>;
  /** Anula un cobro que ya no debe poder completarse (pedido caducado) */
  cancelPaymentIntent(id: string): Promise<void>;
  /**
   * Verifica la FIRMA de un aviso (webhook) y lo traduce. Lanza si la firma
   * no es válida. Devuelve null si es un tipo de aviso que no nos interesa
   */
  parseWebhookEvent(rawBody: Buffer, signature: string): PaymentEvent | null;
}
