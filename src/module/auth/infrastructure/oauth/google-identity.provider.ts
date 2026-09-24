import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { TokenPayload } from 'google-auth-library';
import { OAuth2Client } from 'google-auth-library';
import type { GoogleOAuthConfig } from '../../../../config';
import { googleOAuthConfig } from '../../../../config';
import type {
  OAuthIdentityProvider,
  OAuthUserProfile,
} from '../../domain/services/oauth-identity-provider.interface';

/**
 * Proveedor de identidad de Google (flujo authorization code).
 *
 * El frontend (useGoogleLogin con flow 'auth-code') obtiene un CODE de un
 * solo uso y nos lo envía. Aquí:
 *   1. Canjeamos el code con Google usando el client secret → id_token
 *   2. Verificamos ese id_token con la librería oficial (firma, expiración,
 *      y que `aud` sea NUESTRO client id)
 *
 * Ventaja sobre el flujo anterior: el id_token nunca pasa por el navegador.
 */
@Injectable()
export class GoogleIdentityProvider implements OAuthIdentityProvider {
  readonly providerName = 'google';

  private readonly client: OAuth2Client;

  constructor(
    @Inject(googleOAuthConfig.KEY)
    private readonly config: GoogleOAuthConfig,
  ) {
    // 'postmessage' es el redirect_uri especial del flujo popup:
    // el code no llega por redirección HTTP sino vía window.postMessage
    this.client = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      'postmessage',
    );
  }
  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    let payload: TokenPayload | undefined;
    try {
      // Canje: code → tokens de Google (incluye id_token porque el
      // frontend pide los scopes openid/email/profile por defecto)
      const { tokens } = await this.client.getToken(code);
      if (!tokens.id_token) {
        throw new Error('Google no devolvió id_token');
      }

      // Misma verificación criptográfica que antes
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.config.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      // No filtramos el motivo exacto (code usado, expirado, firma...):
      // al cliente le basta saber que no sirve
      throw new UnauthorizedException('Código de Google inválido');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException(
        'El token de Google no contiene la información necesaria',
      );
    }

    return {
      provider: this.providerName,
      providerId: payload.sub, // `sub`: id estable del usuario en Google
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture ?? null,
    };
  }
}
