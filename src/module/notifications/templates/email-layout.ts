/**
 * Plantilla base de los correos de ÁMBAR: cabecera con la marca, tarjeta
 * blanca y pie. Cada correo solo aporta su contenido; así todos se ven
 * iguales y un cambio de diseño se hace en UN sitio.
 *
 * HTML "de la vieja escuela" a propósito (tablas y estilos en línea):
 * Gmail y Outlook ignoran casi todo el CSS moderno.
 */

/** Correo listo para enviar: asunto + HTML + texto plano */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const EMAIL_COLORS = {
  background: '#fbf7f3',
  card: '#ffffff',
  text: '#1a120d',
  muted: '#8a7a70',
  border: '#f1e3d9',
  coral: '#ff4d2e',
};
export const EMAIL_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/**
 * Escapa el texto que viene del USUARIO (nombre, dirección...). Nunca se
 * mete texto de usuario en HTML sin escapar: alguien llamado
 * "<img src=x onerror=...>" inyectaría código en el correo.
 */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Botón principal (coral). `href` y `label` se escapan aquí. */
export const emailButton = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td style="background:${EMAIL_COLORS.coral};border-radius:4px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:${EMAIL_FONT};font-size:14px;color:#ffffff;text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;

interface EmailLayoutOptions {
  /** <title> y texto de vista previa en la bandeja (ya escapados aquí) */
  title: string;
  preview: string;
  /** HTML del contenido: quien lo construye escapa lo que venga del usuario */
  bodyHtml: string;
  /** Línea del pie (por qué recibe este correo) */
  footer: string;
}

export function renderEmailLayout({
  title,
  preview,
  bodyHtml,
  footer,
}: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.background};">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;font-family:${EMAIL_FONT};font-size:26px;font-weight:bold;letter-spacing:4px;color:${EMAIL_COLORS.text};">
              ÁMBAR
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.border};border-radius:8px;padding:32px;font-family:${EMAIL_FONT};font-size:14px;line-height:22px;color:${EMAIL_COLORS.text};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;font-family:${EMAIL_FONT};font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">
              ${escapeHtml(footer)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
