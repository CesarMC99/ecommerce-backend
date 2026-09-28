import {
  EMAIL_COLORS,
  emailButton,
  escapeHtml,
  renderEmailLayout,
  type RenderedEmail,
} from '../../../notifications/templates/email-layout';

interface PasswordChangedContext {
  name: string;
  changedAt: Date;
  /** Por si NO fue él: lleva a recuperar la contraseña */
  recoverUrl: string;
}

/**
 * Aviso de seguridad "Tu contraseña ha cambiado". Si alguien entra en la
 * cuenta y cambia la contraseña, el dueño se entera al momento y puede
 * recuperarla. Función pura: se testea sin enviar nada.
 */
export function renderPasswordChangedEmail({
  name,
  changedAt,
  recoverUrl,
}: PasswordChangedContext): RenderedEmail {
  const firstName = name.split(' ')[0];
  const when = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(changedAt);
  const subject = 'Tu contraseña de ÁMBAR ha cambiado';

  const html = renderEmailLayout({
    title: subject,
    preview: `Se cambió la contraseña de tu cuenta el ${when}.`,
    footer:
      'Recibes este aviso de seguridad porque tienes una cuenta en ÁMBAR.',
    bodyHtml: `
      <div style="font-size:22px;font-weight:bold;">Hola, ${escapeHtml(firstName)}</div>
      <p style="margin:12px 0 0;color:${EMAIL_COLORS.muted};">
        La contraseña de tu cuenta se cambió el <strong style="color:${EMAIL_COLORS.text};">${escapeHtml(when)}</strong>
        (hora de España). Por seguridad, hemos cerrado la sesión en tus otros dispositivos.
      </p>
      <p style="margin:12px 0 0;color:${EMAIL_COLORS.muted};">
        Si has sido tú, no tienes que hacer nada. Si <strong style="color:${EMAIL_COLORS.text};">no has sido tú</strong>,
        recupera tu cuenta ahora:
      </p>
      ${emailButton(recoverUrl, 'Recuperar mi cuenta')}`,
  });

  const text = [
    `Hola, ${firstName}`,
    '',
    `La contraseña de tu cuenta de ÁMBAR se cambió el ${when} (hora de España).`,
    'Por seguridad, hemos cerrado la sesión en tus otros dispositivos.',
    '',
    'Si no has sido tú, recupera tu cuenta ahora:',
    recoverUrl,
  ].join('\n');

  return { subject, html, text };
}
