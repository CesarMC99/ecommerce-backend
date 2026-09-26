/** Máximo de favoritos por usuario: evita listas infinitas. */
export const MAX_FAVORITES = 200;

/**
 * Entidad de dominio: la lista de favoritos de un usuario con sesión.
 *
 * Solo guarda ids de producto, ordenados del MÁS RECIENTE al más antiguo
 * (lo último que guardaste aparece primero en /favoritos). Inmutable, como
 * Cart: cada operación devuelve una lista nueva.
 */
export class FavoriteList {
  constructor(
    public readonly id: string | null,
    public readonly userId: string,
    public readonly productIds: readonly string[],
  ) {}

  static empty(userId: string): FavoriteList {
    return new FavoriteList(null, userId, []);
  }

  has(productId: string): boolean {
    return this.productIds.includes(productId);
  }

  /** Añade al PRINCIPIO; si ya estaba, lo sube arriba (no se duplica). */
  add(productId: string): FavoriteList {
    const withoutIt = this.productIds.filter((id) => id !== productId);
    return this.withIds([productId, ...withoutIt].slice(0, MAX_FAVORITES));
  }

  remove(productId: string): FavoriteList {
    return this.withIds(this.productIds.filter((id) => id !== productId));
  }

  /** Lo que hace el corazón: si está lo quita, si no está lo añade. */
  toggle(productId: string): FavoriteList {
    return this.has(productId) ? this.remove(productId) : this.add(productId);
  }

  /**
   * Fusiona los favoritos del invitado con los de la cuenta. Los del
   * invitado van PRIMERO: son los que acaba de guardar en esta visita.
   */
  merge(guestProductIds: string[]): FavoriteList {
    const merged = [...new Set([...guestProductIds, ...this.productIds])];
    return this.withIds(merged.slice(0, MAX_FAVORITES));
  }

  private withIds(productIds: string[]): FavoriteList {
    return new FavoriteList(this.id, this.userId, productIds);
  }
}
