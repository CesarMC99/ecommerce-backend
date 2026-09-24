/**
 * Perfil normalizado que devuelve CUALQUIER proveedor OAuth.
 *
 * Google, GitHub, Apple... cada uno tiene su formato de token y sus claims,
 * pero todos se traducen a esta forma común. Gracias a eso existe UN solo
 * use-case de login social para todos los proveedores.
 */
export interface OAuthUserProfile {
  /** Nombre del proveedor: 'google', 'github', ... */
  provider: string;
  /** Identificador estable del usuario en el proveedor (`sub` en Google) */
  providerId: string;
  email: string;
  /** ¿El proveedor garantiza que el email está verificado? */
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

///////////

/**
 * Puerto de un proveedor de identidad OAuth.
 *
 * Para añadir GitHub/Apple/Facebook basta con:
 *   1. Crear una clase que implemente esta interfaz (en infrastructure/oauth)
 *   2. Añadirla a la lista del token OAUTH_PROVIDERS en auth.module.ts
 * Nada más cambia: use-cases, resolver e inputs quedan intactos (Open/Closed).
 */

///////////

export interface OAuthIdentityProvider {
  /** Nombre con el que se registra ('google', 'github'...) */
  readonly providerName: string;

  /**
   * Canjea el authorization code (de un solo uso) con el proveedor,
   * verifica criptográficamente la identidad resultante y devuelve el
   * perfil normalizado. Lanza UnauthorizedException si el code es
   * inválido, ya fue usado o no corresponde a nuestra app.
   */
  exchangeCode(code: string): Promise<OAuthUserProfile>;
}
