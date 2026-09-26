/**
 * Entidad de dominio Order (pedido).
 *
 * A diferencia del carrito, el pedido es una FOTO FIJA: guarda nombre,
 * talla y PRECIO de cada línea tal como eran al comprar. Si mañana el abrigo
 * sube de precio o cambia de nombre, el pedido de hoy debe seguir diciendo
 * lo que el cliente pagó (también es un requisito legal: es su justificante).
 */

export enum OrderStatus {
  /** Creado, stock reservado, esperando que el cliente pague */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  /** No se pagó a tiempo o se canceló: el stock se devolvió */
  CANCELLED = 'CANCELLED',
}

/** Minutos para pagar antes de que el pedido caduque y se libere el stock. */
export const PAYMENT_WINDOW_MINUTES = 30;

export interface OrderLine {
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  size: string;
  /** Foto principal (publicId de Cloudinary) para mostrar el pedido */
  imagePublicId: string | null;
  /** Precio unitario en céntimos EN EL MOMENTO de la compra */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ShippingAddress {
  fullName: string;
  /** Formato internacional E.164: +34612345678 */
  phone: string;
  /** Calle, número, piso... en una sola línea */
  line1: string;
  /** Ciudad del listado de GeoNames (validada en el servidor) */
  city: string;
  /** Código ISO 3166-1 alfa-2: ES, MX... */
  country: string;
}

export class Order {
  constructor(
    public readonly id: string,
    /** Número legible para el cliente y atención al cliente: AMB-XXXXXX */
    public readonly number: string,
    public readonly userId: string,
    /** Correo de contacto del pedido (puede no ser el de la cuenta) */
    public readonly email: string,
    public readonly lines: readonly OrderLine[],
    public readonly subtotal: number,
    public readonly shipping: number,
    public readonly total: number,
    public readonly shippingAddress: ShippingAddress,
    public readonly status: OrderStatus,
    /** Id del PaymentIntent de Stripe (null solo un instante al crearse) */
    public readonly paymentIntentId: string | null,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
    public readonly paidAt: Date | null,
  ) {}

  isPending(): boolean {
    return this.status === OrderStatus.PENDING_PAYMENT;
  }

  /** ¿Pasó el plazo para pagar? Solo tiene sentido si sigue pendiente. */
  isExpired(now: Date = new Date()): boolean {
    return this.isPending() && now.getTime() > this.expiresAt.getTime();
  }

  belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  /** Copia con el PaymentIntent asociado (la entidad es inmutable). */
  withPaymentIntent(paymentIntentId: string): Order {
    return new Order(
      this.id,
      this.number,
      this.userId,
      this.email,
      this.lines,
      this.subtotal,
      this.shipping,
      this.total,
      this.shippingAddress,
      this.status,
      paymentIntentId,
      this.createdAt,
      this.expiresAt,
      this.paidAt,
    );
  }
}
