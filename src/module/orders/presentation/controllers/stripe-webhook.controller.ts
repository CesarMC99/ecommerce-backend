import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  Inject,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PAYMENT_GATEWAY } from '../../../../common/constants/injection-tokens';
import { HandlePaymentEventUseCase } from '../../application/use-cases/handle-payment-event.use-case';
import type { PaymentGateway } from '../../domain/services/payment-gateway';

/**
 * Endpoint REST (no GraphQL) donde Stripe nos avisa de los pagos.
 *
 * ¿Por qué REST? Stripe envía un POST con SU formato y firma el cuerpo
 * EXACTO que envía. Para verificar la firma necesitamos los bytes
 * originales (rawBody), antes de que nadie los convierta a JSON.
 *
 * No lleva JwtAuthGuard: quien llama es Stripe, no un usuario. La
 * "autenticación" es la firma, que se verifica en parseWebhookEvent.
 */
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    private readonly handlePaymentEventUseCase: HandlePaymentEventUseCase,
  ) {}

  @Post('stripe')
  // 200 (y no el 201 por defecto de POST): es lo que Stripe espera
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Falta el cuerpo o la firma');
    }

    let event: ReturnType<PaymentGateway['parseWebhookEvent']>;
    try {
      event = this.paymentGateway.parseWebhookEvent(req.rawBody, signature);
    } catch (error) {
      // Errores "nuestros" (p. ej. falta el secreto → 503) se respetan tal cual
      if (error instanceof HttpException) throw error;
      this.logger.warn(`Webhook con firma inválida: ${String(error)}`);
      throw new BadRequestException('Firma inválida');
    }

    // Si esto lanza, respondemos 500 y Stripe REINTENTA más tarde: es
    // justo lo que queremos si, por ejemplo, la base de datos no responde
    if (event) await this.handlePaymentEventUseCase.execute(event);
    return { received: true };
  }
}
