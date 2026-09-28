import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  PASSWORD_RESET_TOKEN_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import type { PasswordHasher } from '../../domain/services/password-hasher.interface';
import { AccountMailer } from '../services/account-mailer.service';
import { AuthTokenService } from '../services/auth-token.service';

const INVALID_LINK_MESSAGE =
  'El enlace no es válido o ha caducado. Solicita uno nuevo.';

/**
 * Use-case: elegir una contraseña nueva con el enlace del correo.
 *
 * - El token se CONSUME de forma atómica: un enlace vale una sola vez.
 * - Se cierran TODAS las sesiones: si alguien más estaba dentro de la cuenta
 *   (quizá por eso se cambia la contraseña), queda fuera.
 * - Sirve también para que una cuenta de Google cree su primera contraseña:
 *   tener el enlace demuestra que el correo es suyo.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly accountMailer: AccountMailer,
  ) {}

  async execute(plainToken: string, newPassword: string): Promise<void> {
    const now = new Date();
    const userId = await this.resetTokenRepository.consume(
      AuthTokenService.hashToken(plainToken),
      now,
    );
    if (!userId) throw new BadRequestException(INVALID_LINK_MESSAGE);

    const user = await this.userRepository.findById(userId);
    // La cuenta se borró después de pedir el enlace
    if (!user) throw new BadRequestException(INVALID_LINK_MESSAGE);

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updatePasswordHash(user.id, passwordHash);
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    void this.accountMailer.sendPasswordChanged(user, now);
  }
}
