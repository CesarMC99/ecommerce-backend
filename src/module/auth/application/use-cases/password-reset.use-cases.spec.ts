import { BadRequestException } from '@nestjs/common';
import type { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { renderPasswordResetEmail } from '../emails/password-reset.email';
import type { AccountMailer } from '../services/account-mailer.service';
import { AuthTokenService } from '../services/auth-token.service';
import {
  RequestPasswordResetUseCase,
  RESET_LINK_VALID_MINUTES,
  RESET_REQUEST_COOLDOWN_MS,
} from './request-password-reset.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { buildUser } from './test-helpers';

/**
 * Repositorio EN MEMORIA de tokens: se comporta como el real (un token por
 * hash, consumir solo una vez y solo si no caducó), así los tests prueban
 * de verdad las reglas de "un solo uso" y "caducidad".
 */
class InMemoryResetTokens implements PasswordResetTokenRepository {
  tokens: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }[] = [];

  replaceForUser(userId: string, tokenHash: string, expiresAt: Date) {
    for (const t of this.tokens) {
      if (t.userId === userId && !t.usedAt) t.usedAt = new Date();
    }
    this.tokens.push({
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(
        expiresAt.getTime() - RESET_LINK_VALID_MINUTES * 60_000,
      ),
    });
    return Promise.resolve();
  }

  findLatestCreatedAt(userId: string) {
    const mine = this.tokens.filter((t) => t.userId === userId);
    return Promise.resolve(mine.at(-1)?.createdAt ?? null);
  }

  consume(tokenHash: string, now: Date) {
    const token = this.tokens.find(
      (t) => t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > now,
    );
    if (!token) return Promise.resolve(null);
    token.usedAt = now;
    return Promise.resolve(token.userId);
  }
}

describe('Recuperar contraseña', () => {
  const setup = (user = buildUser()) => {
    const userRepository = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn((email: string) =>
        Promise.resolve(email === user.email ? user : null),
      ),
      findByOAuthAccount: jest.fn(),
      create: jest.fn(),
      addOAuthAccount: jest.fn(),
      updateName: jest.fn(),
      updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    };
    const tokens = new InMemoryResetTokens();
    // El mailer falso guarda el token del enlace, como si leyéramos el correo
    let sentToken: string | null = null;
    const accountMailer = {
      sendPasswordReset: jest.fn((_user: unknown, token: string) => {
        sentToken = token;
        return Promise.resolve();
      }),
      sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
    };
    const refreshTokenRepository = {
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      revokeAllForUserExcept: jest.fn(),
    };
    const passwordHasher = {
      hash: jest.fn((plain: string) => Promise.resolve(`hash-${plain}`)),
      compare: jest.fn(),
    };
    const mailer = accountMailer as unknown as AccountMailer;
    return {
      userRepository,
      tokens,
      accountMailer,
      refreshTokenRepository,
      getSentToken: () => sentToken,
      request: new RequestPasswordResetUseCase(userRepository, tokens, mailer),
      reset: new ResetPasswordUseCase(
        tokens,
        userRepository,
        passwordHasher,
        refreshTokenRepository,
        mailer,
      ),
    };
  };

  describe('RequestPasswordResetUseCase', () => {
    it('envía un enlace y guarda SOLO el hash del token', async () => {
      const ctx = setup();

      await ctx.request.execute('cesar@test.com');

      const token = ctx.getSentToken();
      expect(token).toEqual(expect.any(String));
      expect(ctx.tokens.tokens).toHaveLength(1);
      expect(ctx.tokens.tokens[0].tokenHash).toBe(
        AuthTokenService.hashToken(token!),
      );
      expect(ctx.tokens.tokens[0].tokenHash).not.toBe(token);
    });

    it('con un correo sin cuenta no hace nada (y no lanza error)', async () => {
      const ctx = setup();

      await expect(
        ctx.request.execute('nadie@test.com'),
      ).resolves.toBeUndefined();
      expect(ctx.accountMailer.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('no envía otro correo si se pide dos veces en menos de un minuto', async () => {
      const ctx = setup();
      const now = new Date();

      await ctx.request.execute('cesar@test.com', now);
      await ctx.request.execute(
        'cesar@test.com',
        new Date(now.getTime() + RESET_REQUEST_COOLDOWN_MS / 2),
      );

      expect(ctx.accountMailer.sendPasswordReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('ResetPasswordUseCase', () => {
    it('cambia la contraseña, cierra TODAS las sesiones y avisa', async () => {
      const ctx = setup();
      await ctx.request.execute('cesar@test.com');

      await ctx.reset.execute(ctx.getSentToken()!, 'NuevaSegura123!');

      expect(ctx.userRepository.updatePasswordHash).toHaveBeenCalledWith(
        'user-1',
        'hash-NuevaSegura123!',
      );
      expect(ctx.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
      );
      expect(ctx.accountMailer.sendPasswordChanged).toHaveBeenCalled();
    });

    it('un enlace solo vale UNA vez', async () => {
      const ctx = setup();
      await ctx.request.execute('cesar@test.com');
      const token = ctx.getSentToken()!;

      await ctx.reset.execute(token, 'NuevaSegura123!');

      await expect(ctx.reset.execute(token, 'OtraMas456!')).rejects.toThrow(
        BadRequestException,
      );
      expect(ctx.userRepository.updatePasswordHash).toHaveBeenCalledTimes(1);
    });

    it('un enlace anterior deja de valer al pedir uno nuevo', async () => {
      const ctx = setup();
      const now = new Date();
      await ctx.request.execute('cesar@test.com', now);
      const oldToken = ctx.getSentToken()!;
      await ctx.request.execute(
        'cesar@test.com',
        new Date(now.getTime() + RESET_REQUEST_COOLDOWN_MS + 1),
      );

      await expect(
        ctx.reset.execute(oldToken, 'NuevaSegura123!'),
      ).rejects.toThrow('El enlace no es válido o ha caducado');
    });

    it('rechaza un token inventado', async () => {
      const ctx = setup();

      await expect(
        ctx.reset.execute('token-inventado', 'NuevaSegura123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deja crear contraseña a una cuenta de Google (sin contraseña)', async () => {
      const ctx = setup(buildUser({ passwordHash: null }));
      await ctx.request.execute('cesar@test.com');

      await ctx.reset.execute(ctx.getSentToken()!, 'MiPrimeraClave1!');

      expect(ctx.userRepository.updatePasswordHash).toHaveBeenCalled();
    });
  });

  describe('renderPasswordResetEmail', () => {
    it('adapta el texto si la cuenta aún no tiene contraseña', () => {
      const base = {
        name: 'Cesar',
        resetUrl: 'http://localhost:4000/restablecer-contrasena?token=abc',
        validMinutes: 30,
      };
      const reset = renderPasswordResetEmail({ ...base, hasPassword: true });
      const create = renderPasswordResetEmail({ ...base, hasPassword: false });

      expect(reset.subject).toContain('Restablece');
      expect(create.subject).toContain('Crea una contraseña');
      expect(reset.html).toContain('restablecer-contrasena?token=abc');
      expect(reset.text).toContain('30 minutos');
    });
  });
});
