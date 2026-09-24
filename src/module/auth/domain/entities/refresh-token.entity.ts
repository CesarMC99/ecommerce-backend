/**
 * Entidad de dominio RefreshToken: representa UNA sesión activa.
 *
 * Cada login (por dispositivo/navegador) crea un documento propio, así el
 * usuario puede cerrar sesión en un dispositivo sin afectar a los demás.
 *
 * SEGURIDAD: el token en texto plano NUNCA se guarda. Solo su hash SHA-256.
 * Si alguien roba la base de datos, no puede usar los hashes para autenticarse.
 */
export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    /** SHA-256 del token opaco (nunca el token plano) */
    public readonly tokenHash: string,
    public readonly expiresAt: Date,
    /** Fecha de revocación; null = sigue vivo */
    public readonly revokedAt: Date | null,
    /**
     * Hash del token que lo sustituyó al rotar. Permite reconstruir la
     * "cadena" de la sesión y detectar reuso de tokens antiguos.
     */
    public readonly replacedByTokenHash: string | null,
    public readonly createdAt: Date,
  ) {}

  isExpired(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /** Un token solo es utilizable si no expiró y no fue revocado */
  isActive(now: Date = new Date()): boolean {
    return !this.isExpired(now) && !this.isRevoked();
  }
}
