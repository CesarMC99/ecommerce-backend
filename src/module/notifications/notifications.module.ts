import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from '../../common/constants/injection-tokens';
import { ResendEmailSender } from './infrastructure/resend-email-sender';

/**
 * Envío de correos. Solo expone el puerto (EMAIL_SENDER): las plantillas
 * viven en cada módulo que las necesita (pedidos, cuentas...).
 */
@Module({
  providers: [{ provide: EMAIL_SENDER, useClass: ResendEmailSender }],
  exports: [EMAIL_SENDER],
})
export class NotificationsModule {}
