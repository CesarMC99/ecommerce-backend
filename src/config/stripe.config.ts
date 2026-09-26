import { registerAs } from '@nestjs/config';

/**
 * Configuración de Stripe (pagos).
 *
 * secretKey: permite cobrar y reembolsar en la cuenta → SOLO en el backend.
 * webhookSecret: verifica que los avisos que llegan a /webhooks/stripe los
 * envía de verdad Stripe (firma) y no alguien que se hace pasar por él.
 *
 * Si faltan, la app arranca igual (el resto de la tienda funciona) y el
 * checkout responde con un error claro al intentar pagar.
 */
export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
}));

export type StripeConfig = ReturnType<typeof stripeConfig>;

/** Moneda de la tienda (código ISO en minúsculas, como lo pide Stripe). */
export const STORE_CURRENCY = 'eur';
