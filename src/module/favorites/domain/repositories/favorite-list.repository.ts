import { FavoriteList } from '../entities/favorite-list.entity';

/**
 * Puerto del repositorio de favoritos (una lista por usuario con sesión).
 * Los favoritos de invitado viven en el navegador, igual que su carrito.
 */
export interface FavoriteListRepository {
  findByUserId(userId: string): Promise<FavoriteList | null>;
  /** Crea o reemplaza la lista del usuario (upsert). */
  save(list: FavoriteList): Promise<FavoriteList>;
}
