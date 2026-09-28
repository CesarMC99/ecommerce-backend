import {
  EMAIL_COLORS,
  emailButton,
  escapeHtml,
  renderEmailLayout,
  type RenderedEmail,
} from '../../../notifications/templates/email-layout';

interface PasswordResetContext {
  name: string;
  resetUrl: string;
  /** Minutos que dura el enlace */
  validMinutes: number;
  /** false = cuenta solo-Google: va a CREAR su primera contraseña */
  hasPassword: boolean;
}

/** Correo con el enlace para restablecer (o crear) la contraseña. */
export function renderPasswordResetEmail({
  name,
  resetUrl,
  validMinutes,
  hasPassword,
}: PasswordResetContext): RenderedEmail {
  const firstName = name.split(' ')[0];
  const action = hasPassword ? 'restablecer' : 'crear';
  const subject = hasPassword
    ? 'Restablece tu contraseña de ÁMBAR'
    : 'Crea una contraseña para tu cuenta de ÁMBAR';

  const html = renderEmailLayout({
    title: subject,
    preview: `Usa este enlace para ${action} tu contraseña. Caduca en ${validMinutes} minutos.`,
    footer:
      'Recibes este correo porque alguien pidió cambiar la contraseña de tu cuenta de ÁMBAR.',
    bodyHtml: `
      <div style="font-size:22px;font-weight:bold;">Hola, ${escapeHtml(firstName)}</div>
      <p style="margin:12px 0 0;color:${EMAIL_COLORS.muted};">
        Hemos recibido una solicitud para ${action} la contraseña de tu cuenta.
        Pulsa el botón para elegir una nueva:
      </p>
      ${emailButton(resetUrl, hasPassword ? 'Restablecer contraseña' : 'Crear contraseña')}
      <p style="margin:24px 0 0;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">
        El enlace caduca en <strong style="color:${EMAIL_COLORS.text};">${validMinutes} minutos</strong> y solo se puede usar una vez.
        Si no lo has pedido tú, ignora este correo: tu contraseña no cambiará.
      </p>`,
  });

  const text = [
    `Hola, ${firstName}`,
    '',
    `Hemos recibido una solicitud para ${action} la contraseña de tu cuenta de ÁMBAR.`,
    'Abre este enlace para elegir una nueva:',
    resetUrl,
    '',
    `El enlace caduca en ${validMinutes} minutos y solo se puede usar una vez.`,
    'Si no lo has pedido tú, ignora este correo: tu contraseña no cambiará.',
  ].join('\n');

  return { subject, html, text };
}
