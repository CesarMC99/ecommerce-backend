import { Cart } from '../entities/cart.entity';

/**
 * Puerto del repositorio de carritos (uno por usuario con sesión).
 * Los carritos de invitado NO se guardan en el backend: viven en el
 * navegador y se envían a `cartQuote` para calcular precios.
 */
export interface CartRepository {
  /** El carrito del usuario, o null si nunca añadió nada. */
  findByUserId(userId: string): Promise<Cart | null>;
  /** Crea o reemplaza el carrito del usuario (upsert). */
  save(cart: Cart): Promise<Cart>;
}
