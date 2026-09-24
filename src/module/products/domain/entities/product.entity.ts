/**
 * Entidad de dominio Product.
 *
 * Igual que User, es una clase "pura": no conoce Mongoose ni GraphQL.
 * Aquí viven las REGLAS de negocio del producto (¿está rebajado?, ¿es
 * nuevo?, ¿hay stock?). Si mañana cambia la regla de "nuevo" de 30 a 15
 * días, se cambia en un solo sitio y toda la app (API, home, catálogo) la
 * respeta automáticamente.
 */

// Enums de TypeScript (no uniones de strings) porque la capa de presentación
// los registra tal cual como enums de GraphQL: una sola definición para ambos
export enum ProductCategory {
  WOMEN = 'WOMEN',
  MEN = 'MEN',
  ACCESSORIES = 'ACCESSORIES',
}

/** DRAFT: existe pero no se muestra en la tienda. ACTIVE: visible. */
export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
}

/** Días durante los que un producto recién publicado se considera "Nuevo". */
export const NEW_PRODUCT_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProductColor {
  name: string; // 'Camel'
  hex: string; // '#c8a06a' → el círculo de color del filtro y del detalle
}

/**
 * Stock POR TALLA: en ropa lo que se agota es "la M", no "el abrigo".
 * Los accesorios sin talla usan una única entrada (p. ej. 'ÚNICA').
 */
export interface ProductSizeStock {
  size: string;
  stock: number;
}

/**
 * Imagen alojada en Cloudinary (fase 2). Se guarda el publicId y NO la URL:
 * la URL se construye con el tamaño que necesite cada pantalla, y cambiar
 * de proveedor no obliga a reescribir la base de datos.
 */
export interface ProductImage {
  publicId: string;
  alt: string; // texto alternativo: accesibilidad y SEO
  width: number;
  height: number;
}

export class Product {
  constructor(
    public readonly id: string,
    /** Identificador legible y único para la URL: 'abrigo-de-lana' */
    public readonly slug: string,
    public readonly name: string,
    public readonly description: string,
    /**
     * Precio en CÉNTIMOS y como entero (18900 = 189,00 €).
     * Con decimales, JavaScript hace cosas como 0.1 + 0.2 = 0.30000000000000004:
     * en dinero eso son céntimos que no cuadran. Con enteros, nunca pasa.
     */
    public readonly price: number,
    /** Precio anterior en céntimos. Solo tiene valor si está rebajado */
    public readonly compareAtPrice: number | null,
    public readonly category: ProductCategory,
    /** Tipo de prenda: 'Abrigos', 'Camisas'... */
    public readonly type: string,
    public readonly color: ProductColor,
    public readonly sizes: ProductSizeStock[],
    /** La primera imagen es la principal */
    public readonly images: ProductImage[],
    public readonly rating: number,
    public readonly reviewsCount: number,
    /** Aparece en "Destacados" y sube al principio en el orden por defecto */
    public readonly isFeatured: boolean,
    public readonly status: ProductStatus,
    /**
     * Cuándo se publicó en la tienda. Es distinto de createdAt: un producto
     * puede crearse como borrador hoy y publicarse la semana que viene, y
     * "Nuevo" debe contar desde que el cliente pudo verlo
     */
    public readonly publishedAt: Date,
    public readonly createdAt: Date,
  ) {}

  /** Rebajado = tiene precio anterior Y es mayor que el actual. */
  isOnSale(): boolean {
    return this.compareAtPrice !== null && this.compareAtPrice > this.price;
  }

  /**
   * Porcentaje de descuento redondeado (240 → 189 = 21). Se CALCULA en vez
   * de guardarse: si alguien cambia el precio, la etiqueta "-21%" nunca
   * puede quedarse desactualizada.
   */
  discountPercentage(): number | null {
    if (!this.isOnSale()) return null;
    const compareAt = this.compareAtPrice as number;
    return Math.round(((compareAt - this.price) / compareAt) * 100);
  }

  /** `now` es un parámetro para poder testear con una fecha fija. */
  isNew(now: Date = new Date()): boolean {
    const ageInDays = (now.getTime() - this.publishedAt.getTime()) / MS_PER_DAY;
    return ageInDays >= 0 && ageInDays <= NEW_PRODUCT_DAYS;
  }

  /** La primera imagen es la principal; null si aún no tiene fotos. */
  mainImage(): ProductImage | null {
    return this.images[0] ?? null;
  }

  /** ¿Queda al menos una talla con stock? */
  isInStock(): boolean {
    return this.sizes.some((size) => size.stock > 0);
  }
}
