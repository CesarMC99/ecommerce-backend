import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_SENDER } from '../../../../common/constants/injection-tokens';
import { appConfig } from '../../../../config';
import type { AppConfig } from '../../../../config';
import type { EmailSender } from '../../../notifications/domain/email-sender';
import type { User } from '../../../users/domain/entities/user.entity';
import { renderPasswordChangedEmail } from '../emails/password-changed.email';

/** Ruta del frontend para recuperar la contraseña (paso "recuperar contraseña"). */
export const PASSWORD_RECOVERY_PATH = '/recuperar-contrasena';

/**
 * Correos de seguridad de la cuenta. Igual que OrderMailer, NUNCA lanza:
 * si el proveedor de correo falla, el cambio de contraseña ya está hecho y
 * no debe mostrarse como un error.
 */
@Injectable()
export class AccountMailer {
  private readonly logger = new Logger(AccountMailer.name);

  constructor(
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async sendPasswordChanged(user: User, changedAt: Date): Promise<void> {
    try {
      const email = renderPasswordChangedEmail({
        name: user.name,
        changedAt,
        recoverUrl: `${this.app.frontendUrl}${PASSWORD_RECOVERY_PATH}`,
      });
      await this.emailSender.send({ to: user.email, ...email });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el aviso de cambio de contraseña a ${user.id}`,
        error,
      );
    }
  }
}
