import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { AuthTokenService } from '../services/auth-token.service';
import type { CreateUserData } from '../../../users/domain/repositories/user.repository';
import type { OAuthUserProfile } from '../../domain/services/oauth-identity-provider.interface';
import { LoginWithOAuthUseCase } from './login-with-oauth.use-case';
import { buildAuthTokenServiceMock, buildUser } from './test-helpers';

describe('LoginWithOAuthUseCase', () => {
  const profile: OAuthUserProfile = {
    provider: 'google',
    providerId: 'google-sub-123',
    email: 'cesar@test.com',
    emailVerified: true,
    name: 'Cesar',
    avatarUrl: 'http://avatar',
  };

  const setup = () => {
    const googleProvider = {
      providerName: 'google',
      exchangeCode: jest.fn().mockResolvedValue(profile),
    };
    const userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByOAuthAccount: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data: CreateUserData) =>
          Promise.resolve(buildUser({ ...data, id: 'user-nuevo' })),
        ),
      addOAuthAccount: jest.fn(),
    };
    const user = buildUser();
    const authTokenService = buildAuthTokenServiceMock(user);
    const useCase = new LoginWithOAuthUseCase(
      [googleProvider],
      userRepository,
      authTokenService as unknown as AuthTokenService,
    );
    return { useCase, googleProvider, userRepository, authTokenService, user };
  };

  it('usuario recurrente: lo encuentra por (provider, providerId)', async () => {
    const { useCase, userRepository, authTokenService, user } = setup();
    userRepository.findByOAuthAccount.mockResolvedValue(user);

    await useCase.execute({ provider: 'google', code: 'auth-code' });

    expect(userRepository.findByOAuthAccount).toHaveBeenCalledWith(
      'google',
      'google-sub-123',
    );
    // No se crea nada nuevo: se emiten tokens para el usuario existente
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(authTokenService.issueTokens).toHaveBeenCalledWith(user);
  });

  it('usuario nuevo: lo crea sin contraseña y con la cuenta OAuth vinculada', async () => {
    const { useCase, userRepository } = setup();

    await useCase.execute({ provider: 'google', code: 'auth-code' });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'cesar@test.com',
        passwordHash: null, // solo login social: no hay contraseña
        oauthAccounts: [{ provider: 'google', providerId: 'google-sub-123' }],
      }),
    );
  });

  it('vinculación: si el email ya existe como cuenta local, vincula el proveedor', async () => {
    const { useCase, userRepository, user } = setup();
    userRepository.findByEmail.mockResolvedValue(user);
    userRepository.addOAuthAccount.mockResolvedValue(user);

    await useCase.execute({ provider: 'google', code: 'auth-code' });

    expect(userRepository.addOAuthAccount).toHaveBeenCalledWith(user.id, {
      provider: 'google',
      providerId: 'google-sub-123',
    });
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('NO vincula si el email del proveedor no está verificado (anti secuestro de cuenta)', async () => {
    const { useCase, googleProvider, userRepository, user } = setup();
    googleProvider.exchangeCode.mockResolvedValue({
      ...profile,
      emailVerified: false,
    });
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({ provider: 'google', code: 'auth-code' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('propaga el error si el token de Google es inválido', async () => {
    const { useCase, googleProvider, authTokenService } = setup();
    googleProvider.exchangeCode.mockRejectedValue(
      new UnauthorizedException('Token de Google inválido'),
    );

    await expect(
      useCase.execute({ provider: 'google', code: 'code-invalido' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(authTokenService.issueTokens).not.toHaveBeenCalled();
  });

  it('rechaza un proveedor no registrado', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ provider: 'facebook', code: 'x' }),
    ).rejects.toThrow(BadRequestException);
  });
});
