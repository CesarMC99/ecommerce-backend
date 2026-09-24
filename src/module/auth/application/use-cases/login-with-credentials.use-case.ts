import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { PasswordHasher } from '../../domain/services/password-hasher.interface';
import { AuthTokenService } from '../services/auth-token.service';
import type { AuthResult } from '../services/auth-token.service';

export interface LoginWithCredentialsCommand {
  email: string;
  password: string;
}

/** Use-case: login con email y contraseña. */
@Injectable()
export class LoginWithCredentialsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: LoginWithCredentialsCommand): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(command.email);

    // Mensaje ÚNICO para todos los fallos: no revelar si el email existe
    // o si el usuario es "solo Google" evita que un atacante enumere cuentas
    const invalidCredentials = () =>
      new UnauthorizedException('Credenciales inválidas');

    if (!user || !user.hasLocalCredentials()) {
      throw invalidCredentials();
    }

    const passwordMatches = await this.passwordHasher.compare(
      command.password,
      user.passwordHash as string,
    );
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    return this.authTokenService.issueTokens(user);
  }
}
