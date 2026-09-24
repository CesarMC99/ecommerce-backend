import { UnauthorizedException } from '@nestjs/common';
import type { AuthTokenService } from '../services/auth-token.service';
import { AuthTokenService as AuthTokenServiceClass } from '../services/auth-token.service';
import { RefreshTokensUseCase } from './refresh-tokens.use-case';
import {
  buildAuthTokenServiceMock,
  buildRefreshToken,
  buildUser,
} from './test-helpers';

describe('RefreshTokensUseCase', () => {
  const user = buildUser();
  const plainToken = 'token-plano';

  const setup = () => {
    const storedToken = buildRefreshToken({
      tokenHash: AuthTokenServiceClass.hashToken(plainToken),
    });
    const refreshTokenRepository = {
      findByTokenHash: jest.fn().mockResolvedValue(storedToken),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const userRepository = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      findByOAuthAccount: jest.fn(),
      create: jest.fn(),
      addOAuthAccount: jest.fn(),
    };
    const authTokenService = buildAuthTokenServiceMock(user);
    const useCase = new RefreshTokensUseCase(
      refreshTokenRepository,
      userRepository,
      authTokenService as unknown as AuthTokenService,
    );
    return {
      useCase,
      storedToken,
      refreshTokenRepository,
      userRepository,
      authTokenService,
    };
  };

  it('rota el token: emite un par nuevo y revoca el usado', async () => {
    const { useCase, refreshTokenRepository, storedToken, authTokenService } =
      setup();

    const result = await useCase.execute(plainToken);

    expect(result.accessToken).toBe(authTokenService.result.accessToken);
    // El token viejo queda revocado apuntando al hash del nuevo (la cadena)
    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(
      storedToken.id,
      AuthTokenServiceClass.hashToken(authTokenService.result.refreshToken),
    );
  });

  it('REUSO: si el token ya está revocado, revoca TODAS las sesiones del usuario', async () => {
    const { useCase, refreshTokenRepository } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken({
        tokenHash: AuthTokenServiceClass.hashToken(plainToken),
        revokedAt: new Date(), // ya fue usado/rotado antes
      }),
    );

    await expect(useCase.execute(plainToken)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('rechaza un token expirado', async () => {
    const { useCase, refreshTokenRepository } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken({
        tokenHash: AuthTokenServiceClass.hashToken(plainToken),
        expiresAt: new Date(Date.now() - 1000), // ya pasó
      }),
    );

    await expect(useCase.execute(plainToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token desconocido o vacío', async () => {
    const { useCase, refreshTokenRepository } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute('token-falso')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(useCase.execute('')).rejects.toThrow(UnauthorizedException);
  });
});
