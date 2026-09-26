import {
  Product,
  ProductCategory,
  ProductColor,
  ProductStatus,
} from '../entities/product.entity';

/** Órdenes disponibles en el catálogo (los mismos del selector del diseño). */
export enum ProductSort {
  /** Destacados primero, luego mejor valorados */
  FEATURED = 'FEATURED',
  /** Publicados más recientemente primero ("Novedades") */
  NEWEST = 'NEWEST',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
  /** Mejor valorados primero; a igual nota, el que tiene más reseñas */
  RATING = 'RATING',
}

/**
 * Criterios de búsqueda del catálogo. Todos los filtros son opcionales:
 * sin filtros, se devuelve todo (paginado).
 */
export interface ProductSearchCriteria {
  status?: ProductStatus;
  category?: ProductCategory;
  /** Nombre del color, p. ej. 'Camel' */
  color?: string;
  /** Talla, p. ej. 'M': solo productos con stock EN ESA talla */
  size?: string;
  /** Precio máximo en céntimos (incluido) */
  maxPrice?: number;
  /** Valoración mínima (incluida), p. ej. 4 → 4 estrellas o más */
  minRating?: number;
  /** true → solo productos rebajados */
  onSale?: boolean;
  /** true → solo destacados (la sección "Destacados" de la home) */
  featured?: boolean;
  /** Slug a excluir (p. ej. el producto que ya se está viendo) */
  excludeSlug?: string;
  sort: ProductSort;
  /** Página empezando en 1 */
  page: number;
  pageSize: number;
}

export interface ProductSearchResult {
  items: Product[];
  /** Total de productos que cumplen los filtros (sin paginar) */
  totalCount: number;
}

/**
 * Valores disponibles para construir los filtros del catálogo: qué colores
 * y tallas existen y entre qué precios se mueve el catálogo. Se calculan a
 * partir de los productos reales, así el filtro nunca ofrece una opción que
 * no devolvería ningún resultado (y se actualiza solo al añadir productos).
 */
export interface ProductFacets {
  colors: ProductColor[];
  sizes: string[];
  /** Precio más bajo del catálogo en céntimos (0 si está vacío) */
  minPrice: number;
  /** Precio más alto del catálogo en céntimos (0 si está vacío) */
  maxPrice: number;
}

/**
 * Puerto (interfaz) del repositorio de productos.
 * Los use-cases dependen de ESTA interfaz; la implementación Mongoose se
 * inyecta con el token PRODUCT_REPOSITORY (igual que UserRepository).
 */
export interface ProductRepository {
  findMany(criteria: ProductSearchCriteria): Promise<ProductSearchResult>;
  findBySlug(slug: string): Promise<Product | null>;
  /**
   * Varios productos por id en UNA consulta (el carrito necesita los datos
   * de todas sus líneas a la vez). Los ids inexistentes simplemente no
   * aparecen en el resultado; el orden no está garantizado.
   */
  findByIds(ids: string[]): Promise<Product[]>;
  /** Facetas calculadas sobre los productos con ese estado */
  findFacets(status: ProductStatus): Promise<ProductFacets>;
  /**
   * Resta `quantity` unidades del stock de una talla SOLO si hay suficientes,
   * en UNA operación atómica. Devuelve false si no había stock bastante.
   * Atómica = dos compras simultáneas de la última unidad no pueden ganar
   * las dos: la base de datos garantiza que solo una resta.
   */
  reserveStock(
    productId: string,
    size: string,
    quantity: number,
  ): Promise<boolean>;
  /** Devuelve unidades al stock (pedido cancelado o expirado). */
  releaseStock(
    productId: string,
    size: string,
    quantity: number,
  ): Promise<void>;
}
