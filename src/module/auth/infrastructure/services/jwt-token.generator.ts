import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { jwtConfig } from '../../../../config';
import type { JwtConfig } from '../../../../config';
import type {
  AccessTokenPayload,
  TokenGenerator,
} from '../../domain/services/token-generator.interface';

/**
 * Adaptador de TokenGenerator sobre @nestjs/jwt.
 * Firma access tokens de vida corta con el secreto de la app.
 */
@Injectable()
export class JwtTokenGenerator implements TokenGenerator {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) private readonly config: JwtConfig,
  ) {}

  generateAccessToken(payload: AccessTokenPayload): Promise<string> {
    // Se copia a objeto plano y se castea expiresIn: los tipos de
    // jsonwebtoken v9 esperan un literal tipo "15m", no un string genérico
    return this.jwtService.signAsync(
      { ...payload },
      {
        secret: this.config.accessSecret,
        expiresIn: this.config.accessExpiresIn as JwtSignOptions['expiresIn'],
      },
    );
  }
}
