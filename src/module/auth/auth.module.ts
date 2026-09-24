import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import {
  OAUTH_PROVIDERS,
  PASSWORD_HASHER,
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_GENERATOR,
} from '../../common/constants/injection-tokens';
import { UsersModule } from '../users/users.module';
import { AuthTokenService } from './application/services/auth-token.service';
import { LoginWithCredentialsUseCase } from './application/use-cases/login-with-credentials.use-case';
import { LoginWithOAuthUseCase } from './application/use-cases/login-with-oauth.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { GoogleIdentityProvider } from './infrastructure/oauth/google-identity.provider';
import {
  RefreshTokenDocument,
  RefreshTokenSchema,
} from './infrastructure/persistence/refresh-token.schema';
import { RefreshTokenRepositoryImpl } from './infrastructure/repositories/refresh-token.repository.impl';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';
import { JwtTokenGenerator } from './infrastructure/services/jwt-token.generator';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { RefreshTokenCookie } from './presentation/refresh-token-cookie';
import { AuthResolver } from './presentation/resolvers/auth.resolver';

/**
 * Módulo de autenticación.
 *
 * Aquí es donde las ABSTRACCIONES del dominio se conectan con sus
 * implementaciones concretas (los `provide: TOKEN, useClass: Impl`).
 * Es el único sitio del módulo que conoce ambas partes.
 */
@Module({
  imports: [
    UsersModule, // nos presta USER_REPOSITORY
    PassportModule,
    // register() vacío: el secreto y la expiración se pasan al firmar
    // (en JwtTokenGenerator), leídos de la config tipada
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: RefreshTokenDocument.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [
    // --- Presentación ---
    AuthResolver,
    RefreshTokenCookie,

    // --- Aplicación ---
    AuthTokenService,
    RegisterUserUseCase,
    LoginWithCredentialsUseCase,
    LoginWithOAuthUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,

    // --- Infraestructura: estrategia passport para validar access tokens ---
    JwtStrategy,

    // --- Puertos → adaptadores ---
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: JwtTokenGenerator },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepositoryImpl },

    // --- Registro de proveedores OAuth ---
    // Para añadir GitHub/Apple: crear su clase en infrastructure/oauth
    // e incluirla en este array. Nada más cambia en el sistema.
    GoogleIdentityProvider,
    {
      provide: OAUTH_PROVIDERS,
      useFactory: (google: GoogleIdentityProvider) => [google],
      inject: [GoogleIdentityProvider],
    },
  ],
})
export class AuthModule {}
