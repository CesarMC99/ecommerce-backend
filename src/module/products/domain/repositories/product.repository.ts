import {
  Product,
  ProductCategory,
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
  /** Precio máximo en céntimos (incluido) */
  maxPrice?: number;
  /** true → solo productos rebajados */
  onSale?: boolean;
  /** true → solo destacados (la sección "Destacados" de la home) */
  featured?: boolean;
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
 * Puerto (interfaz) del repositorio de productos.
 * Los use-cases dependen de ESTA interfaz; la implementación Mongoose se
 * inyecta con el token PRODUCT_REPOSITORY (igual que UserRepository).
 */
export interface ProductRepository {
  findMany(criteria: ProductSearchCriteria): Promise<ProductSearchResult>;
  findBySlug(slug: string): Promise<Product | null>;
}
