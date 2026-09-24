import { OAuthAccount, Role, User } from '../entities/user.entity';

/**
 * Datos necesarios para crear un usuario (el id y createdAt los genera la BD).
 */
export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string | null;
  roles: Role[];
  oauthAccounts: OAuthAccount[];
  avatarUrl: string | null;
}

/**
 * Puerto (interfaz) del repositorio de usuarios.
 *
 * La capa de aplicación depende de ESTA interfaz, nunca de Mongoose.
 * La implementación concreta vive en infrastructure/ y se inyecta con el
 * token USER_REPOSITORY. Cambiar de MongoDB a otra BD = escribir otra
 * implementación, sin tocar los use-cases.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Busca por cuenta OAuth vinculada: la vía principal de login social. */
  findByOAuthAccount(
    provider: string,
    providerId: string,
  ): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  /** Vincula una nueva cuenta OAuth a un usuario existente. */
  addOAuthAccount(userId: string, account: OAuthAccount): Promise<User>;
}
