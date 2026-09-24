/**
 * Entidad de dominio Cart (carrito de un usuario con sesión).
 *
 * Solo guarda QUÉ quiere comprar el usuario (producto, talla, cantidad),
 * nunca precios: el precio se calcula siempre en el momento, a partir del
 * producto actual. Si el carrito guardara el precio, un cambio de precio o
 * el fin de una rebaja no se reflejarían, y un cliente malicioso podría
 * intentar colar su propio precio.
 */

/** Máximo de unidades de UNA misma línea (producto + talla). */
export const MAX_QUANTITY_PER_LINE = 10;

/** Máximo de líneas distintas: evita carritos gigantes que abusen del servidor. */
export const MAX_CART_LINES = 50;

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
}

/** Dos líneas son "la misma" si coinciden producto Y talla. */
const isSameLine = (a: CartItem, b: Pick<CartItem, 'productId' | 'size'>) =>
  a.productId === b.productId && a.size === b.size;

const clampQuantity = (quantity: number) =>
  Math.min(MAX_QUANTITY_PER_LINE, Math.max(0, Math.floor(quantity)));

export class Cart {
  constructor(
    public readonly id: string | null,
    public readonly userId: string,
    // Inmutable: cada operación devuelve un Cart NUEVO en vez de modificar
    // este. Así nunca hay cambios "a medias" y es fácil de testear
    public readonly items: readonly CartItem[],
  ) {}

  static empty(userId: string): Cart {
    return new Cart(null, userId, []);
  }

  /** Añade unidades; si la línea ya existe, SUMA en vez de duplicarla. */
  addItem(item: CartItem): Cart {
    const existing = this.items.find((line) => isSameLine(line, item));
    if (existing) {
      return this.withItems(
        this.items.map((line) =>
          isSameLine(line, item)
            ? {
                ...line,
                quantity: clampQuantity(line.quantity + item.quantity),
              }
            : line,
        ),
      );
    }
    if (this.items.length >= MAX_CART_LINES) return this;
    return this.withItems([
      ...this.items,
      { ...item, quantity: clampQuantity(item.quantity) },
    ]);
  }

  /** Fija la cantidad exacta de una línea. Cantidad 0 = eliminarla. */
  setQuantity(
    line: Pick<CartItem, 'productId' | 'size'>,
    quantity: number,
  ): Cart {
    const clamped = clampQuantity(quantity);
    if (clamped === 0) return this.removeItem(line);
    return this.withItems(
      this.items.map((item) =>
        isSameLine(item, line) ? { ...item, quantity: clamped } : item,
      ),
    );
  }

  removeItem(line: Pick<CartItem, 'productId' | 'size'>): Cart {
    return this.withItems(this.items.filter((item) => !isSameLine(item, line)));
  }

  /**
   * Fusiona el carrito de invitado (el del navegador) con este. Se SUMAN
   * las cantidades de las líneas repetidas: si como invitado añadiste una
   * camisa M y tu cuenta ya tenía otra, ahora tienes 2 (con el tope por línea).
   */
  merge(guestItems: CartItem[]): Cart {
    return guestItems.reduce<Cart>((cart, item) => cart.addItem(item), this);
  }

  clear(): Cart {
    return this.withItems([]);
  }

  /** Número total de unidades (lo que muestra el contador del header). */
  itemCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  private withItems(items: CartItem[]): Cart {
    return new Cart(this.id, this.userId, items);
  }
}
