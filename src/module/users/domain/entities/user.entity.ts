/**
 * Entidad de dominio User.
 *
 * Es una clase "pura": no sabe nada de Mongoose ni de GraphQL. Las capas de
 * infraestructura (schema) y presentación (ObjectType) tienen sus propias
 * representaciones y los mappers traducen entre ellas. Así el dominio no se
 * contamina con detalles de framework (Clean Architecture).
 */

export type Role = 'customer' | 'admin';

/**
 * Cuenta OAuth vinculada al usuario.
 * Guardamos el par (provider, providerId) porque el `sub` de Google (u otro
 * proveedor) es el identificador ESTABLE del usuario; el email puede cambiar.
 */
export interface OAuthAccount {
  provider: string; // 'google' | 'github' | ... (extensible)
  providerId: string; // el `sub` que entrega el proveedor
}

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    /**
     * Hash bcrypt de la contraseña. Es `null` para usuarios que solo se han
     * registrado vía OAuth (nunca definieron contraseña local).
     */
    public readonly passwordHash: string | null,
    public readonly roles: Role[],
    public readonly oauthAccounts: OAuthAccount[],
    public readonly avatarUrl: string | null,
    public readonly createdAt: Date,
  ) {}

  /** ¿Puede este usuario iniciar sesión con email + contraseña? */
  hasLocalCredentials(): boolean {
    return this.passwordHash !== null;
  }

  /** ¿Tiene vinculado este proveedor OAuth? */
  hasOAuthProvider(provider: string): boolean {
    return this.oauthAccounts.some((account) => account.provider === provider);
  }
}
