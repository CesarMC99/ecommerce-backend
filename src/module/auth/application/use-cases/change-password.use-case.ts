import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PASSWORD_HASHER,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import type { PasswordHasher } from '../../domain/services/password-hasher.interface';
import { AccountMailer } from '../services/account-mailer.service';
import { AuthTokenService } from '../services/auth-token.service';

export interface ChangePasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
  /** Refresh token de ESTA sesión (cookie): es la única que se mantiene */
  currentRefreshToken: string | undefined;
}

/**
 * Use-case: cambiar la contraseña estando dentro de la cuenta.
 *
 * Seguridad:
 *  - Exige la contraseña ACTUAL. Si alguien usa un portátil con tu sesión
 *    abierta (o roba el token), no puede cambiarla y dejarte fuera.
 *  - Las cuentas solo-Google no tienen contraseña y NO pueden crearla aquí:
 *    un token robado bastaría para ponerle una y quedarse la cuenta. Deben
 *    usar "recuperar contraseña", que demuestra que el correo es suyo.
 *  - Tras el cambio se cierran las DEMÁS sesiones (si alguien estaba dentro,
 *    queda fuera) y se envía un aviso por correo al dueño.
 *
 * Los errores son BAD_USER_INPUT y no UNAUTHENTICATED a propósito: el
 * frontend trata UNAUTHENTICATED como "sesión caducada" y cerraría la sesión.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly accountMailer: AccountMailer,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.hasLocalCredentials()) {
      throw new BadRequestException(
        'Tu cuenta usa Google para iniciar sesión. Para crear una contraseña, usa "¿Olvidaste tu contraseña?"',
      );
    }

    const isCurrentValid = await this.passwordHasher.compare(
      command.currentPassword,
      user.passwordHash as string,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (command.currentPassword === command.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }

    const newHash = await this.passwordHasher.hash(command.newPassword);
    await this.userRepository.updatePasswordHash(user.id, newHash);

    await this.refreshTokenRepository.revokeAllForUserExcept(
      user.id,
      command.currentRefreshToken
        ? AuthTokenService.hashToken(command.currentRefreshToken)
        : null,
    );

    // void: el aviso no retrasa la respuesta (y AccountMailer nunca lanza)
    void this.accountMailer.sendPasswordChanged(user, new Date());
  }
}
