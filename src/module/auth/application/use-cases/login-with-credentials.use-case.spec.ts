import { UnauthorizedException } from '@nestjs/common';
import type { AuthTokenService } from '../services/auth-token.service';
import { LoginWithCredentialsUseCase } from './login-with-credentials.use-case';
import { buildAuthTokenServiceMock, buildUser } from './test-helpers';

describe('LoginWithCredentialsUseCase', () => {
  const user = buildUser();

  const setup = () => {
    const userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(user),
      findByOAuthAccount: jest.fn(),
      create: jest.fn(),
      addOAuthAccount: jest.fn(),
    };
    const passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(true),
    };
    const authTokenService = buildAuthTokenServiceMock(user);
    const useCase = new LoginWithCredentialsUseCase(
      userRepository,
      passwordHasher,
      authTokenService as unknown as AuthTokenService,
    );
    return { useCase, userRepository, passwordHasher, authTokenService };
  };

  it('devuelve tokens cuando las credenciales son correctas', async () => {
    const { useCase, authTokenService, passwordHasher } = setup();

    const result = await useCase.execute({
      email: 'cesar@test.com',
      password: 'secreta123',
    });

    // La contraseña se comparó contra el hash guardado, nunca en claro
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'secreta123',
      user.passwordHash,
    );
    expect(authTokenService.issueTokens).toHaveBeenCalledWith(user);
    expect(result.accessToken).toBe(authTokenService.result.accessToken);
  });

  it('rechaza cuando el email no existe (mismo mensaje genérico)', async () => {
    const { useCase, userRepository } = setup();
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'nadie@test.com', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza cuando la contraseña no coincide', async () => {
    const { useCase, passwordHasher, authTokenService } = setup();
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'cesar@test.com', password: 'mala' }),
    ).rejects.toThrow(UnauthorizedException);
    // Y por supuesto no se emiten tokens
    expect(authTokenService.issueTokens).not.toHaveBeenCalled();
  });

  it('rechaza a un usuario solo-OAuth (sin contraseña local)', async () => {
    const { useCase, userRepository } = setup();
    userRepository.findByEmail.mockResolvedValue(
      buildUser({ passwordHash: null }),
    );

    await expect(
      useCase.execute({ email: 'cesar@test.com', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
