import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { PasswordHasher } from '../../domain/services/password-hasher.interface';
import { AuthTokenService } from '../services/auth-token.service';
import type { AuthResult } from '../services/auth-token.service';

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
}

/**
 * Use-case: registro con email y contraseña.
 *
 * Un use-case = una acción de negocio. Orquesta puertos del dominio
 * (repositorio, hasher) sin conocer Mongoose ni GraphQL, así se testea
 * con mocks simples y se reutiliza desde cualquier capa de entrada.
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      // En registro sí es aceptable revelar que el email existe: el propio
      // formulario lo necesita para guiar al usuario ("ya tienes cuenta")
      throw new ConflictException('Ya existe una cuenta con este email');
    }

    // La contraseña jamás se guarda en claro: solo su hash bcrypt
    const passwordHash = await this.passwordHasher.hash(command.password);

    const user = await this.userRepository.create({
      name: command.name,
      email: command.email,
      passwordHash,
      roles: ['customer'], // rol por defecto; 'admin' se asigna manualmente
      oauthAccounts: [],
      avatarUrl: null,
    });

    // El registro deja al usuario logueado: emitimos tokens directamente
    return this.authTokenService.issueTokens(user);
  }
}
