import { BadRequestException, NotFoundException } from '@nestjs/common';
import { renderPasswordChangedEmail } from '../emails/password-changed.email';
import type { AccountMailer } from '../services/account-mailer.service';
import { AuthTokenService } from '../services/auth-token.service';
import { ChangePasswordUseCase } from './change-password.use-case';
import { buildUser } from './test-helpers';
import { UpdateProfileUseCase } from './update-profile.use-case';

describe('Perfil', () => {
  const setup = (user = buildUser()) => {
    const userRepository = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      findByOAuthAccount: jest.fn(),
      create: jest.fn(),
      addOAuthAccount: jest.fn(),
      updateName: jest.fn((_id: string, name: string) =>
        Promise.resolve(buildUser({ ...user, name })),
      ),
      updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    };
    // Hasher falso: "hash-<contraseña>" y compara con esa regla
    const passwordHasher = {
      hash: jest.fn((plain: string) => Promise.resolve(`hash-${plain}`)),
      compare: jest.fn((plain: string, hash: string) =>
        Promise.resolve(hash === `hash-${plain}`),
      ),
    };
    const refreshTokenRepository = {
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
      revokeAllForUserExcept: jest.fn().mockResolvedValue(undefined),
    };
    const accountMailer = {
      sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
    };
    const changePassword = new ChangePasswordUseCase(
      userRepository,
      passwordHasher,
      refreshTokenRepository,
      accountMailer as unknown as AccountMailer,
    );
    return {
      userRepository,
      refreshTokenRepository,
      accountMailer,
      changePassword,
      updateProfile: new UpdateProfileUseCase(userRepository),
    };
  };

  describe('UpdateProfileUseCase', () => {
    it('cambia el nombre (sin espacios sobrantes)', async () => {
      const { updateProfile, userRepository } = setup();

      const user = await updateProfile.execute('user-1', {
        name: '  Cesar Mejía ',
      });

      expect(userRepository.updateName).toHaveBeenCalledWith(
        'user-1',
        'Cesar Mejía',
      );
      expect(user.name).toBe('Cesar Mejía');
    });

    it('falla si el usuario ya no existe', async () => {
      const { updateProfile, userRepository } = setup();
      userRepository.findById.mockResolvedValue(null);

      await expect(
        updateProfile.execute('user-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ChangePasswordUseCase', () => {
    const user = buildUser({ passwordHash: 'hash-Actual123!' });
    const command = {
      userId: 'user-1',
      currentPassword: 'Actual123!',
      newPassword: 'Nueva456!',
      currentRefreshToken: 'refresh-de-esta-sesion',
    };

    it('guarda el hash nuevo, cierra las OTRAS sesiones y avisa por correo', async () => {
      const ctx = setup(user);

      await ctx.changePassword.execute(command);

      expect(ctx.userRepository.updatePasswordHash).toHaveBeenCalledWith(
        'user-1',
        'hash-Nueva456!',
      );
      // Se mantiene SOLO la sesión actual (por el hash de su refresh token)
      expect(
        ctx.refreshTokenRepository.revokeAllForUserExcept,
      ).toHaveBeenCalledWith(
        'user-1',
        AuthTokenService.hashToken('refresh-de-esta-sesion'),
      );
      expect(ctx.accountMailer.sendPasswordChanged).toHaveBeenCalledWith(
        user,
        expect.any(Date),
      );
    });

    it('rechaza una contraseña actual incorrecta sin cambiar nada', async () => {
      const ctx = setup(user);

      await expect(
        ctx.changePassword.execute({ ...command, currentPassword: 'mal' }),
      ).rejects.toThrow('La contraseña actual no es correcta');
      expect(ctx.userRepository.updatePasswordHash).not.toHaveBeenCalled();
      expect(
        ctx.refreshTokenRepository.revokeAllForUserExcept,
      ).not.toHaveBeenCalled();
    });

    it('rechaza repetir la misma contraseña', async () => {
      const ctx = setup(user);

      await expect(
        ctx.changePassword.execute({ ...command, newPassword: 'Actual123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('no deja crear contraseña a una cuenta solo-Google', async () => {
      const ctx = setup(buildUser({ passwordHash: null }));

      await expect(ctx.changePassword.execute(command)).rejects.toThrow(
        '¿Olvidaste tu contraseña?',
      );
      expect(ctx.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('renderPasswordChangedEmail', () => {
    it('incluye la fecha, el enlace de recuperación y escapa el nombre', () => {
      const email = renderPasswordChangedEmail({
        name: '<b>Cesar</b> Mejía',
        changedAt: new Date('2026-09-25T18:30:00Z'),
        recoverUrl: 'http://localhost:4000/recuperar-contrasena',
      });

      expect(email.subject).toBe('Tu contraseña de ÁMBAR ha cambiado');
      expect(email.html).toContain(
        'http://localhost:4000/recuperar-contrasena',
      );
      // 18:30 UTC = 20:30 en Madrid (horario de verano)
      expect(email.html).toContain('20:30');
      expect(email.html).not.toContain('<b>Cesar</b>');
      expect(email.text).toContain('recuperar-contrasena');
    });
  });
});
