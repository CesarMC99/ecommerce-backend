import { RefreshToken } from '../entities/refresh-token.entity';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Puerto del repositorio de refresh tokens.
 * Igual que UserRepository: la aplicación depende de esta interfaz y la
 * implementación Mongoose se inyecta con REFRESH_TOKEN_REPOSITORY.
 */
export interface RefreshTokenRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  create(data: CreateRefreshTokenData): Promise<RefreshToken>;
  /** Revoca un token y (opcionalmente) anota cuál lo reemplazó (rotación). */
  revoke(id: string, replacedByTokenHash?: string): Promise<void>;
  /**
   * Revoca TODAS las sesiones activas de un usuario. Se usa cuando se
   * detecta reuso de un token (posible robo) o para un "logout global".
   */
  revokeAllForUser(userId: string): Promise<void>;
}
