import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OAUTH_PROVIDERS,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { User } from '../../../users/domain/entities/user.entity';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import type {
  OAuthIdentityProvider,
  OAuthUserProfile,
} from '../../domain/services/oauth-identity-provider.interface';
import type { AuthResult } from '../services/auth-token.service';
import { AuthTokenService } from '../services/auth-token.service';

export interface LoginWithOAuthCommand {
  /** 'google' hoy; 'github', 'apple'... cuando se registren sus providers */
  provider: string;
  /** Authorization code de un solo uso obtenido por el frontend */
  code: string;
}

/**
 * Use-case GENÉRICO de login social (sirve para cualquier proveedor).
 *
 * Recibe la lista de providers registrados (token OAUTH_PROVIDERS) y resuelve
 * el correcto por nombre. Añadir un proveedor nuevo NO toca este archivo:
 * solo se crea su adaptador y se registra en auth.module.ts (Open/Closed).
 *
 * Flujo: verificar token → buscar por (provider, providerId) →
 *        si no, vincular por email verificado → si no, crear usuario →
 *        emitir los JWT PROPIOS de la app (jamás los del proveedor).
 */
@Injectable()
export class LoginWithOAuthUseCase {
  /** Mapa nombre → provider para resolver en O(1) */
  private readonly providersByName: Map<string, OAuthIdentityProvider>;

  constructor(
    @Inject(OAUTH_PROVIDERS)
    providers: OAuthIdentityProvider[],
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
  ) {
    this.providersByName = new Map(
      providers.map((provider) => [provider.providerName, provider]),
    );
  }

  async execute(command: LoginWithOAuthCommand): Promise<AuthResult> {
    const provider = this.providersByName.get(command.provider);
    if (!provider) {
      throw new BadRequestException(
        `Proveedor OAuth no soportado: ${command.provider}`,
      );
    }

    // El canje y la verificación criptográfica los hace el adaptador del
    // proveedor (con la librería oficial); si falla, lanza Unauthorized
    const profile = await provider.exchangeCode(command.code);

    const user = await this.findOrCreateUser(profile);

    return this.authTokenService.issueTokens(user);
  }

  private async findOrCreateUser(profile: OAuthUserProfile): Promise<User> {
    // 1) Camino feliz: el usuario ya inició sesión antes con este proveedor
    const byProvider = await this.userRepository.findByOAuthAccount(
      profile.provider,
      profile.providerId,
    );
    if (byProvider) {
      return byProvider;
    }

    // 2) Vinculación: existe una cuenta con ese email (ej: se registró con
    //    contraseña). Solo vinculamos si el proveedor VERIFICÓ el email;
    //    si no, alguien podría crear una cuenta Google con el email de otra
    //    persona y "secuestrar" su cuenta local
    const byEmail = await this.userRepository.findByEmail(profile.email);
    if (byEmail) {
      if (!profile.emailVerified) {
        throw new UnauthorizedException(
          'El email del proveedor no está verificado',
        );
      }
      return this.userRepository.addOAuthAccount(byEmail.id, {
        provider: profile.provider,
        providerId: profile.providerId,
      });
    }

    // 3) Usuario nuevo: se crea sin contraseña (solo login social)
    return this.userRepository.create({
      name: profile.name,
      email: profile.email,
      passwordHash: null,
      roles: ['customer'],
      oauthAccounts: [
        { provider: profile.provider, providerId: profile.providerId },
      ],
      avatarUrl: profile.avatarUrl,
    });
  }
}
