import { Role } from '../../../users/domain/entities/user.entity';

/** Claims que van dentro del access token de la aplicación. */
export interface AccessTokenPayload {
  /** `sub` estándar JWT: el id del usuario */
  sub: string;
  email: string;
  roles: Role[];
}

/**
 * Puerto para la generación de access tokens.
 * Oculta a la aplicación el detalle de que usamos JWT firmados con
 * @nestjs/jwt (podría ser PASETO u otro formato sin tocar los use-cases).
 */
export interface TokenGenerator {
  generateAccessToken(payload: AccessTokenPayload): Promise<string>;
}
