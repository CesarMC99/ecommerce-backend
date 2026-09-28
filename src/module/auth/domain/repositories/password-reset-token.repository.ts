/**
 * Puerto del repositorio de tokens de recuperación de contraseña.
 *
 * Igual que los refresh tokens: el token del enlace NUNCA se guarda en
 * claro, solo su hash SHA-256. Si alguien lee la base de datos, no puede
 * usar esos hashes para cambiar contraseñas ajenas.
 */
export interface PasswordResetTokenRepository {
  /**
   * Crea un token nuevo e INVALIDA los anteriores del usuario: solo sirve
   * el enlace del último correo (el resto, si alguien los tiene, no valen)
   */
  replaceForUser(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  /** Fecha del último token pedido por el usuario (para no enviar spam) */
  findLatestCreatedAt(userId: string): Promise<Date | null>;
  /**
   * Marca el token como USADO si existe, no se usó y no caducó, todo en una
   * operación atómica: aunque el enlace se abra dos veces a la vez, solo
   * una lo consume. Devuelve el userId dueño o null si no es válido
   */
  consume(tokenHash: string, now: Date): Promise<string | null>;
}
