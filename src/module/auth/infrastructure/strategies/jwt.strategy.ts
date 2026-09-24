import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../../../config';
import type { JwtConfig } from '../../../../config';
import type { AccessTokenPayload } from '../../domain/services/token-generator.interface';

/**
 * Usuario autenticado tal y como queda disponible en `req.user`
 * (lo que devuelve validate()). Es lo que recibe @CurrentUser().
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: AccessTokenPayload['roles'];
}

/**
 * Estrategia passport-jwt: valida el access token en cada petición protegida.
 *
 * passport ya se encarga de: extraer el `Authorization: Bearer <token>`,
 * verificar la firma con nuestro secreto y comprobar la expiración.
 * Si todo es válido, llama a validate() con el payload decodificado y el
 * retorno se adjunta como `req.user` (que consume el JwtAuthGuard).
 *
 * No consultamos la BD aquí a propósito: el access token dura 15 min, y ese
 * es el trade-off aceptado para que cada request no cueste una query extra.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(jwtConfig.KEY) config: JwtConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
