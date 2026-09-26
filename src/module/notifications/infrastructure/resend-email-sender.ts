import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { emailConfig } from '../../../config';
import type { EmailConfig } from '../../../config';
import type { EmailMessage, EmailSender } from '../domain/email-sender';

/**
 * Adaptador de Resend para el puerto EmailSender. Es el único archivo que
 * importa 'resend'.
 *
 * Sin RESEND_API_KEY (p. ej. al clonar el proyecto) NO falla: registra en
 * el log qué correo habría enviado. Así el checkout funciona igual en
 * local aunque no haya proveedor de correo configurado.
 */
@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private client: Resend | null = null;

  constructor(@Inject(emailConfig.KEY) private readonly config: EmailConfig) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.config.resendApiKey) {
      this.logger.warn(
        `RESEND_API_KEY no configurada: no se envía "${message.subject}" a ${message.to}`,
      );
      return;
    }
    this.client ??= new Resend(this.config.resendApiKey);

    // El SDK de Resend no lanza excepciones: devuelve { data, error }
    const { data, error } = await this.client.emails.send(
      {
        from: this.config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (error) {
      throw new Error(`Resend rechazó el correo: ${error.message}`);
    }
    this.logger.log(`Correo enviado a ${message.to} (${data.id})`);
  }
}
