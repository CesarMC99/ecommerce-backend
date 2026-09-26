import {
  Order,
  OrderLine,
  OrderStatus,
  ShippingAddress,
} from '../entities/order.entity';

/** Datos para crear un pedido (id y fechas de sistema los pone la BD). */
export interface CreateOrderData {
  number: string;
  userId: string;
  email: string;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: ShippingAddress;
  expiresAt: Date;
}

/**
 * Puerto del repositorio de pedidos.
 *
 * Los cambios de estado son CONDICIONALES y atómicos (markPaidIfPending,
 * cancelIfPending): el pago puede confirmarse por DOS caminos a la vez (el
 * aviso de Stripe y la vuelta del cliente). Solo uno de ellos "gana" la
 * transición y hace el trabajo (vaciar carrito, devolver stock...); el
 * otro recibe null y no repite nada. Esto es lo que se llama idempotencia.
 */
export interface OrderRepository {
  create(data: CreateOrderData): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByPaymentIntentId(paymentIntentId: string): Promise<Order | null>;
  /** El pedido pendiente de pago del usuario, si lo hay */
  findPendingByUser(userId: string): Promise<Order | null>;
  /** Pedidos pendientes cuyo plazo de pago ya venció */
  findExpiredPending(now: Date, limit: number): Promise<Order[]>;
  /** Pedidos del usuario, el más reciente primero (para "Mis pedidos") */
  findByUser(userId: string, status?: OrderStatus): Promise<Order[]>;
  setPaymentIntentId(orderId: string, paymentIntentId: string): Promise<void>;
  /** PENDING → PAID. null si el pedido ya no estaba pendiente */
  markPaidIfPending(orderId: string, paidAt: Date): Promise<Order | null>;
  /** PENDING → CANCELLED. null si el pedido ya no estaba pendiente */
  cancelIfPending(orderId: string): Promise<Order | null>;
}
