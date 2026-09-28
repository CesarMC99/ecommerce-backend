import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { AccountMailer } from '../services/account-mailer.service';
import { AuthTokenService } from '../services/auth-token.service';

/** Minutos que dura el enlace del correo. */
export const RESET_LINK_VALID_MINUTES = 30;
/** Tiempo mínimo entre dos correos al mismo usuario (evita usar la tienda para spamear). */
export const RESET_REQUEST_COOLDOWN_MS = 60_000;

/**
 * Use-case: "¿Olvidaste tu contraseña?" → enviar un enlace por correo.
 *
 * NUNCA dice si el correo existe: responde igual en todos los casos. Si
 * dijera "ese correo no está registrado", cualquiera podría averiguar
 * quién tiene cuenta en la tienda (enumeración de cuentas).
 */
@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    private readonly accountMailer: AccountMailer,
  ) {}

  async execute(email: string, now: Date = new Date()): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    // Sin cuenta: no se hace nada, pero la respuesta al cliente es la misma
    if (!user) return;

    // Anti-spam: como mucho un correo por minuto a la misma persona
    const latest = await this.resetTokenRepository.findLatestCreatedAt(user.id);
    if (
      latest &&
      now.getTime() - latest.getTime() < RESET_REQUEST_COOLDOWN_MS
    ) {
      this.logger.warn(
        `Recuperación repetida demasiado pronto para ${user.id}`,
      );
      return;
    }

    // 32 bytes aleatorios (criptográficos): imposible de adivinar.
    // base64url: se puede meter en una URL sin escapar nada raro
    const plainToken = randomBytes(32).toString('base64url');
    await this.resetTokenRepository.replaceForUser(
      user.id,
      AuthTokenService.hashToken(plainToken),
      new Date(now.getTime() + RESET_LINK_VALID_MINUTES * 60_000),
    );

    // Se espera al correo (a diferencia de otros avisos): sin él, el
    // enlace no sirve de nada. AccountMailer igualmente nunca lanza
    await this.accountMailer.sendPasswordReset(
      user,
      plainToken,
      RESET_LINK_VALID_MINUTES,
    );
  }
}
