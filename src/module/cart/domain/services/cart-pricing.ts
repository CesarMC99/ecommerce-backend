import {
  Product,
  ProductStatus,
} from '../../../products/domain/entities/product.entity';
import { CartItem, MAX_QUANTITY_PER_LINE } from '../entities/cart.entity';

/**
 * Reglas de PRECIO del carrito. Funciones puras (sin base de datos ni Nest):
 * reciben los productos ya cargados y devuelven los números. Se usan tanto
 * para el carrito de un usuario con sesión como para el de un invitado, así
 * que los dos ven SIEMPRE el mismo cálculo.
 */

/** Envío gratis a partir de este subtotal, en céntimos (50 €). */
export const FREE_SHIPPING_THRESHOLD = 5000;
/** Coste de envío si no se llega al umbral, en céntimos (4,95 €). */
export const SHIPPING_COST = 495;

/** Por qué una línea no se puede comprar (la UI muestra un aviso). */
export type UnavailableReason =
  | 'PRODUCT_NOT_FOUND' // se borró o nunca existió
  | 'PRODUCT_UNAVAILABLE' // existe, pero ya no está publicado
  | 'SIZE_NOT_FOUND' // esa talla no existe en el producto
  | 'OUT_OF_STOCK'; // la talla existe, pero se agotó

export interface PricedCartLine {
  productId: string;
  size: string;
  quantity: number;
  /** null si el producto ya no existe */
  product: Product | null;
  /** Precio unitario ACTUAL en céntimos (0 si no disponible) */
  unitPrice: number;
  lineTotal: number;
  /** Lo que se ahorra por rebaja en esta línea, en céntimos */
  lineSavings: number;
  unavailableReason: UnavailableReason | null;
  /** Unidades que se pueden comprar como mucho de esta línea */
  maxQuantity: number;
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** Unidades totales de las líneas DISPONIBLES */
  itemCount: number;
  subtotal: number;
  savings: number;
  shipping: number;
  total: number;
  /** Lo que falta para el envío gratis (0 si ya lo tiene) */
  amountToFreeShipping: number;
}

/**
 * ¿Se puede comprar esta talla de este producto? null = sí.
 * Exportada para que "añadir al carrito" valide con la MISMA regla que el
 * cálculo de precios (una sola definición de "disponible")
 */
export function getUnavailableReason(
  product: Product | null,
  size: string,
): UnavailableReason | null {
  if (!product) return 'PRODUCT_NOT_FOUND';
  if (product.status !== ProductStatus.ACTIVE) return 'PRODUCT_UNAVAILABLE';
  const sizeStock = product.sizes.find((entry) => entry.size === size);
  if (!sizeStock) return 'SIZE_NOT_FOUND';
  if (sizeStock.stock <= 0) return 'OUT_OF_STOCK';
  return null;
}

/**
 * Calcula el carrito. Las líneas NO disponibles se devuelven (para poder
 * avisar "este producto se agotó") pero NO suman en los totales: nunca se
 * cobra algo que no se puede enviar.
 */
export function priceCart(
  items: readonly CartItem[],
  productsById: ReadonlyMap<string, Product>,
): PricedCart {
  const lines = items.map<PricedCartLine>((item) => {
    const product = productsById.get(item.productId) ?? null;
    const unavailableReason = getUnavailableReason(product, item.size);

    if (!product || unavailableReason) {
      return {
        ...item,
        product,
        unitPrice: 0,
        lineTotal: 0,
        lineSavings: 0,
        unavailableReason,
        maxQuantity: 0,
      };
    }

    // No se pueden comprar más unidades de las que hay en stock
    const stock = product.sizes.find(
      (entry) => entry.size === item.size,
    )!.stock;
    const maxQuantity = Math.min(MAX_QUANTITY_PER_LINE, stock);
    const quantity = Math.min(item.quantity, maxQuantity);
    const savingsPerUnit = product.isOnSale()
      ? (product.compareAtPrice as number) - product.price
      : 0;

    return {
      ...item,
      quantity,
      product,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
      lineSavings: savingsPerUnit * quantity,
      unavailableReason: null,
      maxQuantity,
    };
  });

  const available = lines.filter((line) => line.unavailableReason === null);
  const subtotal = available.reduce((sum, line) => sum + line.lineTotal, 0);
  const savings = available.reduce((sum, line) => sum + line.lineSavings, 0);
  // Carrito vacío → sin envío. Si no, gratis A PARTIR del umbral (≥ 50 €):
  // así "te faltan X €" es un número limpio (10,00 € y no 10,01 €)
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  return {
    lines,
    itemCount: available.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    savings,
    shipping,
    total: subtotal + shipping,
    amountToFreeShipping:
      shipping === 0 ? 0 : FREE_SHIPPING_THRESHOLD - subtotal,
  };
}
