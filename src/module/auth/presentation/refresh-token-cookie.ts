import { Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AppConfig } from '../../../config';
import { appConfig } from '../../../config';

/** Nombre de la cookie donde viaja el refresh token. */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** Contexto GraphQL tal y como lo definimos en app.module.ts. */
export interface GqlContext {
  req: Request & { cookies?: Record<string, string> };
  res: Response;
}

/**
 * Encapsula la lectura/escritura de la cookie del refresh token para que
 * el resolver no repita las opciones de seguridad en cada mutación.
 *
 * Opciones y por qué:
 * - httpOnly: el JS del navegador NO puede leerla → un XSS no roba el token
 * - secure: solo viaja por HTTPS (activado en producción)
 * - sameSite 'lax': el navegador no la envía en peticiones cross-site
 *   arbitrarias → mitiga CSRF sin romper la navegación normal
 * - path '/graphql': solo se envía al endpoint GraphQL, no a toda la app
 */
@Injectable()
export class RefreshTokenCookie {
  constructor(@Inject(appConfig.KEY) private readonly config: AppConfig) {}

  read(context: GqlContext): string | undefined {
    // Express tipa `cookies` como any: se acota aquí para no propagar `any`
    const cookies = context.req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_TOKEN_COOKIE];
  }

  write(context: GqlContext, token: string, expiresAt: Date): void {
    context.res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/graphql',
      expires: expiresAt,
    });
  }

  clear(context: GqlContext): void {
    // Para borrar una cookie hay que usar las MISMAS opciones con las que
    // se creó (si el path no coincide, el navegador la ignora)
    context.res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/graphql',
    });
  }
}
