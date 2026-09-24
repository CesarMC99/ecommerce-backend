import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_GENERATOR,
} from '../../../../common/constants/injection-tokens';
import { jwtConfig } from '../../../../config';
// `import type`: obligatorio para tipos puros usados en firmas decoradas
// (isolatedModules + emitDecoratorMetadata no pueden distinguirlos si no)
import type { JwtConfig } from '../../../../config';
import type { User } from '../../../users/domain/entities/user.entity';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import type { TokenGenerator } from '../../domain/services/token-generator.interface';

/**
 * Resultado de una autenticación exitosa.
 * `refreshToken` viaja en claro SOLO hasta el resolver, que lo mete en la
 * cookie httpOnly. Nunca se persiste ni se expone en el schema GraphQL.
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: User;
}

/**
 * Servicio de aplicación que emite el par de tokens.
 *
 * Existe para NO duplicar lógica: register, login local, login OAuth y
 * refresh terminan todos igual — "emitir access + refresh". Ese final común
 * vive aquí una sola vez (DRY).
 */
@Injectable()
export class AuthTokenService {
  constructor(
    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGenerator,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(jwtConfig.KEY)
    private readonly config: JwtConfig,
  ) {}

  /**
   * Hash SHA-256 del refresh token.
   *
   * SHA-256 (y no bcrypt) es correcto AQUÍ porque el token tiene 64 bytes
   * aleatorios: no hay nada que "adivinar" por fuerza bruta. Además el hash
   * es determinista, lo que permite buscar por él con un índice único.
   */
  static hashToken(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  /** Emite el par (access JWT + refresh opaco) y persiste el refresh hasheado. */
  async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = await this.tokenGenerator.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    });

    // Token opaco: 64 bytes aleatorios ≈ imposible de adivinar
    const refreshToken = randomBytes(64).toString('hex');

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.config.refreshExpiresInDays * 24 * 60 * 60 * 1000,
    );

    // A la BD va SOLO el hash: si roban la BD, los tokens no sirven
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: AuthTokenService.hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt, user };
  }
}
