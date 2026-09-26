/**
 * Puerto para enviar correos. La aplicación dice QUÉ enviar; el adaptador
 * (Resend hoy, Amazon SES mañana) decide CÓMO. Cambiar de proveedor es
 * escribir otro adaptador sin tocar pedidos ni plantillas.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Versión con diseño */
  html: string;
  /** Versión en texto plano: clientes sin HTML y filtros antispam la valoran */
  text: string;
  /**
   * Si el mismo envío se repite con la misma clave, el proveedor no manda
   * un segundo correo (p. ej. un reintento tras un corte de red)
   */
  idempotencyKey?: string;
}

export interface EmailSender {
  /** Lanza si el proveedor rechaza el envío */
  send(message: EmailMessage): Promise<void>;
}
