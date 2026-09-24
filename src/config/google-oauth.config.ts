// import { registerAs } from '@nestjs/config';

// /**
//  * Configuración de Google OAuth.
//  *
//  * Solo necesitamos el Client ID: el backend NO inicia el flujo OAuth
//  * (eso lo hace el frontend). Aquí únicamente VERIFICAMOS el ID Token que
//  * el frontend nos envía, y la verificación exige comprobar que el token
//  * fue emitido para NUESTRO client id (claim `aud`).
//  */
// export const googleOAuthConfig = registerAs('googleOAuth', () => ({
//   clientId: process.env.GOOGLE_CLIENT_ID ?? '',
// }));

// export type GoogleOAuthConfig = ReturnType<typeof googleOAuthConfig>;

import { registerAs } from '@nestjs/config';

/**
 * Configuración de Google OAuth (flujo authorization code).
 *
 * clientId: identifica nuestra app; se valida como `aud` del id_token.
 * clientSecret: demuestra ante Google que quien canjea el code es NUESTRO
 * backend (por eso el canje no puede hacerse en el navegador).
 */
export const googleOAuthConfig = registerAs('googleOAuth', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
}));

export type GoogleOAuthConfig = ReturnType<typeof googleOAuthConfig>;
