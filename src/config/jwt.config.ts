import { registerAs } from '@nestjs/config';

/**
 * Configuración de tokens.
 *
 * - Access token: JWT de vida corta (minutos). Si lo roban, expira rápido.
 * - Refresh token: token opaco de vida larga (días). No es un JWT: se valida
 *   contra la base de datos, lo que permite revocarlo (un JWT puro no se
 *   puede "apagar" antes de su expiración).
 */
export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  // Se expresa en días ("7d") y se convierte a milisegundos para la cookie/BD
  refreshExpiresInDays: parseInt(
    (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d').replace(/\D/g, ''),
    10,
  ),
}));

export type JwtConfig = ReturnType<typeof jwtConfig>;
