import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { AuthTokenService } from '../services/auth-token.service';
import type { AuthResult } from '../services/auth-token.service';

/**
 * Use-case: renovar la sesión con ROTACIÓN de refresh token.
 *
 * Rotación = cada refresh token es de UN SOLO USO. Al usarlo se revoca y se
 * emite uno nuevo. ¿Por qué? Si un atacante roba el token, en cuanto uno de
 * los dos (víctima o atacante) lo use, el del otro deja de valer, y ese
 * segundo intento de uso es DETECTABLE:
 *
 * Detección de reuso: si llega un token que ya está revocado, no sabemos
 * quién es el legítimo, así que se revocan TODAS las sesiones del usuario
 * (cerrar sesión en todos los dispositivos es molesto, pero infinitamente
 * mejor que dejar una sesión robada activa).
 */
@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(plainRefreshToken: string): Promise<AuthResult> {
    const invalidSession = () =>
      new UnauthorizedException('Sesión inválida o expirada');

    if (!plainRefreshToken) {
      throw invalidSession();
    }

    // Se busca por el hash: el token plano nunca toca la base de datos
    const tokenHash = AuthTokenService.hashToken(plainRefreshToken);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw invalidSession();
    }

    // ⚠️ REUSO DETECTADO: este token ya fue rotado/revocado antes.
    // Alguien está usando un token viejo → posible robo → se cierran
    // todas las sesiones del usuario por precaución
    if (storedToken.isRevoked()) {
      await this.refreshTokenRepository.revokeAllForUser(storedToken.userId);
      throw invalidSession();
    }

    if (storedToken.isExpired()) {
      throw invalidSession();
    }

    const user = await this.userRepository.findById(storedToken.userId);
    if (!user) {
      // El usuario fue eliminado: su sesión ya no tiene sentido
      throw invalidSession();
    }

    // ROTACIÓN: emitir el par nuevo y revocar el token usado, dejando
    // rastro de cuál lo reemplazó (útil para auditar la cadena de la sesión)
    const result = await this.authTokenService.issueTokens(user);
    await this.refreshTokenRepository.revoke(
      storedToken.id,
      AuthTokenService.hashToken(result.refreshToken),
    );

    return result;
  }
}
