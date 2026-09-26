import { registerAs } from '@nestjs/config';

/**
 * Configuración del correo transaccional (Resend).
 *
 * `from`: sin dominio propio verificado, Resend solo deja enviar desde
 * onboarding@resend.dev y SOLO al correo del dueño de la cuenta (vale para
 * probar). En producción: verificar el dominio en Resend (registros SPF y
 * DKIM) y usar algo como "ÁMBAR <pedidos@ambar.com>".
 */
export const emailConfig = registerAs('email', () => ({
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  from: process.env.EMAIL_FROM ?? 'ÁMBAR <onboarding@resend.dev>',
}));

export type EmailConfig = ReturnType<typeof emailConfig>;
