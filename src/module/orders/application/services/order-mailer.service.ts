import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_SENDER } from '../../../../common/constants/injection-tokens';
import { appConfig, cloudinaryConfig } from '../../../../config';
import type { AppConfig, CloudinaryConfig } from '../../../../config';
import type { EmailSender } from '../../../notifications/domain/email-sender';
import type { Order } from '../../domain/entities/order.entity';
import { renderOrderConfirmationEmail } from '../emails/order-confirmation.email';

/**
 * Correos de los pedidos. Une la plantilla (pura) con el envío (puerto).
 *
 * NUNCA lanza: si el proveedor de correo falla, el pedido sigue pagado y
 * el cliente ve la confirmación en la web. Un correo que no llega es
 * molesto; un pago que "falla" porque falló el correo sería mucho peor.
 */
@Injectable()
export class OrderMailer {
  private readonly logger = new Logger(OrderMailer.name);

  constructor(
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
    @Inject(cloudinaryConfig.KEY) private readonly cloudinary: CloudinaryConfig,
  ) {}

  async sendOrderConfirmation(order: Order): Promise<void> {
    try {
      const email = renderOrderConfirmationEmail(order, {
        // Detalle del pedido en "Mis pedidos" (pide iniciar sesión si hace falta)
        orderUrl: `${this.app.frontendUrl}/pedidos/${order.id}`,
        // Miniatura recortada por Cloudinary. f_jpg y no f_auto: Outlook no
        // entiende WebP/AVIF, y en correo manda la compatibilidad
        imageUrl: (publicId) =>
          `https://res.cloudinary.com/${this.cloudinary.cloudName}/image/upload/c_fill,g_auto,w_120,h_150,f_jpg,q_auto/${publicId}`,
      });
      await this.emailSender.send({
        to: order.email,
        ...email,
        // Un pedido = un correo de confirmación, aunque se reintente
        idempotencyKey: `order-confirmation/${order.id}`,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la confirmación de ${order.number}`,
        error,
      );
    }
  }
}
