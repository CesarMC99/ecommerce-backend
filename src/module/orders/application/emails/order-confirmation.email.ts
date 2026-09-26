import type { Order } from '../../domain/entities/order.entity';

export interface OrderEmailContext {
  /** Enlace para ver el pedido en la tienda */
  orderUrl: string;
  /** publicId de Cloudinary → URL de la miniatura (null si no hay foto) */
  imageUrl: (publicId: string) => string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Colores de ÁMBAR (globals.css del frontend)
const COLOR = {
  background: '#fbf7f3',
  card: '#ffffff',
  text: '#1a120d',
  muted: '#8a7a70',
  border: '#f1e3d9',
  coral: '#ff4d2e',
};
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );

const countryName = (code: string) =>
  new Intl.DisplayNames(['es'], { type: 'region' }).of(code) ?? code;

/**
 * Escapa el texto que viene del CLIENTE (nombre, dirección...). Sin esto,
 * alguien que se llame "<img src=x onerror=...>" inyectaría HTML en el
 * correo: nunca se mete texto de usuario en HTML sin escapar.
 */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Correo "Pedido confirmado". Función PURA (sin Nest ni Resend): recibe el
 * pedido y devuelve asunto + HTML + texto, así que se testea sin enviar nada.
 *
 * El HTML de correo es "de 2005" a propósito: tablas y estilos en línea.
 * Gmail y Outlook ignoran flexbox, <style> en muchos casos y el CSS moderno.
 */
export function renderOrderConfirmationEmail(
  order: Order,
  context: OrderEmailContext,
): RenderedEmail {
  const address = order.shippingAddress;
  const firstName = address.fullName.split(' ')[0];
  const subject = `Pedido ${order.number} confirmado`;

  const linesHtml = order.lines
    .map((line) => {
      const image = line.imagePublicId
        ? `<img src="${escapeHtml(context.imageUrl(line.imagePublicId))}" width="60" height="75" alt="${escapeHtml(line.name)}" style="display:block;border:0;border-radius:4px;object-fit:cover;">`
        : `<div style="width:60px;height:75px;background:${COLOR.border};border-radius:4px;"></div>`;
      return `
        <tr>
          <td width="72" style="padding:12px 0;vertical-align:top;">${image}</td>
          <td style="padding:12px 12px;vertical-align:top;font-family:${FONT};">
            <div style="font-size:14px;color:${COLOR.text};font-weight:bold;">${escapeHtml(line.name)}</div>
            <div style="font-size:12px;color:${COLOR.muted};margin-top:4px;">
              Talla ${escapeHtml(line.size)} · ${escapeHtml(line.colorName)} · ${line.quantity} × ${money(line.unitPrice)}
            </div>
          </td>
          <td align="right" style="padding:12px 0;vertical-align:top;font-family:${FONT};font-size:14px;color:${COLOR.text};white-space:nowrap;">
            ${money(line.lineTotal)}
          </td>
        </tr>`;
    })
    .join('');

  const totalRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;font-family:${FONT};font-size:${strong ? 16 : 14}px;color:${strong ? COLOR.text : COLOR.muted};${strong ? 'font-weight:bold;' : ''}">${label}</td>
      <td align="right" style="padding:4px 0;font-family:${FONT};font-size:${strong ? 16 : 14}px;color:${COLOR.text};${strong ? 'font-weight:bold;' : ''}">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.background};">
  <!-- Texto de vista previa (lo que se ve junto al asunto en la bandeja) -->
  <div style="display:none;max-height:0;overflow:hidden;">
    Gracias por tu compra, ${escapeHtml(firstName)}. Total: ${money(order.total)}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;font-family:${FONT};font-size:26px;font-weight:bold;letter-spacing:4px;color:${COLOR.text};">
              ÁMBAR
            </td>
          </tr>
          <tr>
            <td style="background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:8px;padding:32px;">
              <div style="font-family:${FONT};font-size:22px;font-weight:bold;color:${COLOR.text};">
                ¡Gracias por tu compra, ${escapeHtml(firstName)}!
              </div>
              <div style="font-family:${FONT};font-size:14px;line-height:22px;color:${COLOR.muted};margin-top:8px;">
                Hemos recibido tu pago. Tu pedido <strong style="color:${COLOR.text};">${escapeHtml(order.number)}</strong> está confirmado y lo prepararemos en breve.
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${COLOR.border};">
                ${linesHtml}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid ${COLOR.border};padding-top:12px;">
                ${totalRow('Subtotal', money(order.subtotal))}
                ${totalRow('Envío', order.shipping === 0 ? 'Gratis' : money(order.shipping))}
                ${totalRow('Total pagado', money(order.total), true)}
              </table>

              <div style="margin-top:24px;padding:16px;background:${COLOR.background};border-radius:6px;font-family:${FONT};font-size:13px;line-height:20px;color:${COLOR.text};">
                <div style="font-size:11px;letter-spacing:1px;color:${COLOR.muted};margin-bottom:4px;">ENVÍO A</div>
                ${escapeHtml(address.fullName)}<br>
                ${escapeHtml(address.line1)}<br>
                ${escapeHtml(address.city)}, ${escapeHtml(countryName(address.country))}<br>
                ${escapeHtml(address.phone)}
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
                <tr>
                  <td style="background:${COLOR.coral};border-radius:4px;">
                    <a href="${escapeHtml(context.orderUrl)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:14px;color:#ffffff;text-decoration:none;">
                      Ver mi pedido
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;font-family:${FONT};font-size:12px;line-height:18px;color:${COLOR.muted};">
              Recibes este correo porque has hecho un pedido en ÁMBAR.<br>
              ¿Dudas? Responde a este correo y te ayudamos.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `¡Gracias por tu compra, ${firstName}!`,
    '',
    `Tu pedido ${order.number} está confirmado.`,
    '',
    ...order.lines.map(
      (line) =>
        `- ${line.name} (talla ${line.size}, ${line.colorName}) × ${line.quantity}: ${money(line.lineTotal)}`,
    ),
    '',
    `Subtotal: ${money(order.subtotal)}`,
    `Envío: ${order.shipping === 0 ? 'Gratis' : money(order.shipping)}`,
    `Total pagado: ${money(order.total)}`,
    '',
    'Envío a:',
    address.fullName,
    address.line1,
    `${address.city}, ${countryName(address.country)}`,
    address.phone,
    '',
    `Ver mi pedido: ${context.orderUrl}`,
  ].join('\n');

  return { subject, html, text };
}
