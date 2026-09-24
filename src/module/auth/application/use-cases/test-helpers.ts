import { User } from '../../../users/domain/entities/user.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import type { AuthResult } from '../services/auth-token.service';
import { AuthTokenService } from '../services/auth-token.service';

/**
 * Helpers compartidos por los tests de los use-cases.
 *
 * Los use-cases reciben sus dependencias por constructor (inyección), así
 * que en los tests basta con pasarles objetos falsos (mocks) que implementan
 * las mismas interfaces. No hace falta base de datos ni Nest para testearlos:
 * esa es la gran ventaja de la arquitectura por puertos.
 */

export const buildUser = (overrides: Partial<User> = {}): User =>
  new User(
    overrides.id ?? 'user-1',
    overrides.name ?? 'Cesar',
    overrides.email ?? 'cesar@test.com',
    'passwordHash' in overrides
      ? (overrides.passwordHash as string | null)
      : 'hash-bcrypt',
    overrides.roles ?? ['customer'],
    overrides.oauthAccounts ?? [],
    overrides.avatarUrl ?? null,
    overrides.createdAt ?? new Date('2026-01-01'),
  );

export const buildRefreshToken = (
  overrides: Partial<RefreshToken> = {},
): RefreshToken =>
  new RefreshToken(
    overrides.id ?? 'token-1',
    overrides.userId ?? 'user-1',
    overrides.tokenHash ?? AuthTokenService.hashToken('token-plano'),
    overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000), // +1h
    'revokedAt' in overrides ? (overrides.revokedAt as Date | null) : null,
    overrides.replacedByTokenHash ?? null,
    overrides.createdAt ?? new Date('2026-01-01'),
  );

/** Mock del AuthTokenService: emite un resultado fijo y predecible. */
export const buildAuthTokenServiceMock = (user: User) => {
  const result: AuthResult = {
    accessToken: 'access-token-firmado',
    refreshToken: 'refresh-token-nuevo',
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    user,
  };
  return {
    issueTokens: jest.fn().mockResolvedValue(result),
    result,
  };
};
