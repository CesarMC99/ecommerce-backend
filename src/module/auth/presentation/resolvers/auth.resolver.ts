import { Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { USER_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import type { User } from '../../../users/domain/entities/user.entity';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import { UserType } from '../../../users/presentation/types/user.type';
import type { AuthResult } from '../../application/services/auth-token.service';
import { LoginWithCredentialsUseCase } from '../../application/use-cases/login-with-credentials.use-case';
import { LoginWithOAuthUseCase } from '../../application/use-cases/login-with-oauth.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from '../../application/use-cases/refresh-tokens.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import type { AuthenticatedUser } from '../../infrastructure/strategies/jwt.strategy';
import { LoginWithGoogleInput } from '../inputs/login-with-google.input';
import { LoginInput } from '../inputs/login.input';
import { RegisterInput } from '../inputs/register.input';
import type { GqlContext } from '../refresh-token-cookie';
import { RefreshTokenCookie } from '../refresh-token-cookie';
import { AuthPayload } from '../types/auth-payload.type';

/**
 * Resolver de autenticación (capa de presentación).
 *
 * Es deliberadamente "delgado": valida la entrada (los inputs), delega TODA
 * la lógica en los use-cases y gestiona el único detalle que pertenece al
 * transporte HTTP: la cookie httpOnly del refresh token.
 */
@Resolver()
export class AuthResolver {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginWithCredentialsUseCase: LoginWithCredentialsUseCase,
    private readonly loginWithOAuthUseCase: LoginWithOAuthUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenCookie: RefreshTokenCookie,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  @Mutation(() => AuthPayload, {
    description: 'Registra un usuario con email y contraseña',
  })
  async register(
    @Args('input') input: RegisterInput,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const result = await this.registerUserUseCase.execute(input);
    return this.toPayload(result, context);
  }

  @Mutation(() => AuthPayload, {
    description: 'Inicia sesión con email y contraseña',
  })
  async login(
    @Args('input') input: LoginInput,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const result = await this.loginWithCredentialsUseCase.execute(input);
    return this.toPayload(result, context);
  }

  @Mutation(() => AuthPayload, {
    description:
      'Recibe el authorization code de Google, lo canjea y verifica en el backend',
  })
  async loginWithGoogle(
    @Args('input') input: LoginWithGoogleInput,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const result = await this.loginWithOAuthUseCase.execute({
      provider: 'google',
      code: input.code,
    });
    return this.toPayload(result, context);
  }

  @Mutation(() => AuthPayload, {
    description:
      'Renueva la sesión usando la cookie httpOnly del refresh token (con rotación)',
  })
  async refreshTokens(@Context() context: GqlContext): Promise<AuthPayload> {
    // El refresh token NO llega como argumento: viaja en la cookie httpOnly
    const refreshToken = this.refreshTokenCookie.read(context) ?? '';
    const result = await this.refreshTokensUseCase.execute(refreshToken);
    return this.toPayload(result, context);
  }

  @Mutation(() => Boolean, {
    description:
      'Cierra la sesión actual: revoca el refresh token y limpia la cookie',
  })
  async logout(@Context() context: GqlContext): Promise<boolean> {
    await this.logoutUseCase.execute(this.refreshTokenCookie.read(context));
    this.refreshTokenCookie.clear(context);
    return true;
  }

  @Query(() => UserType, {
    description: 'Devuelve el usuario autenticado (requiere Bearer token)',
  })
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() authUser: AuthenticatedUser): Promise<UserType> {
    // El JWT ya identifica al usuario; se consulta la BD para devolver
    // datos frescos (nombre/avatar pueden haber cambiado tras emitir el token)
    const user = await this.userRepository.findById(authUser.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toUserType(user);
  }

  /**
   * Punto único de traducción AuthResult → AuthPayload + cookie.
   * Todas las mutaciones que emiten tokens pasan por aquí (DRY).
   */
  private toPayload(result: AuthResult, context: GqlContext): AuthPayload {
    this.refreshTokenCookie.write(
      context,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return {
      accessToken: result.accessToken,
      user: this.toUserType(result.user),
    };
  }

  /** Entidad de dominio → tipo GraphQL (sin passwordHash ni oauthAccounts). */
  private toUserType(user: User): UserType {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}
