import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { AuthTokenService } from '../services/auth-token.service';

/**
 * Use-case: cerrar la sesión actual (revocar su refresh token).
 *
 * Es idempotente a propósito: si el token no existe o ya estaba revocado,
 * el logout "funciona" igual. Fallar aquí no aporta seguridad y sí
 * empeora la experiencia (¿qué haría el usuario con un error de logout?).
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(plainRefreshToken: string | undefined): Promise<void> {
    if (!plainRefreshToken) {
      return;
    }

    const storedToken = await this.refreshTokenRepository.findByTokenHash(
      AuthTokenService.hashToken(plainRefreshToken),
    );

    if (storedToken && !storedToken.isRevoked()) {
      await this.refreshTokenRepository.revoke(storedToken.id);
    }
  }
}
