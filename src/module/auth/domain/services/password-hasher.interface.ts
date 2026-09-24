/**
 * Puerto para el hashing de contraseñas.
 *
 * La aplicación no sabe QUÉ algoritmo se usa (bcrypt hoy, argon2 mañana):
 * solo pide "hashea" y "compara". La implementación se inyecta con el
 * token PASSWORD_HASHER.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, hash: string): Promise<boolean>;
}
