import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { Product } from '../../../products/domain/entities/product.entity';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository';
import type { CartItem } from '../../domain/entities/cart.entity';
import { priceCart, type PricedCart } from '../../domain/services/cart-pricing';

/**
 * Servicio de aplicación: carga los productos de un carrito y le pone precio.
 *
 * Lo comparten TODOS los use-cases del carrito (ver, añadir, fusionar,
 * presupuesto de invitado): la regla "los precios vienen del producto
 * actual, nunca del cliente" vive en un solo sitio.
 */
@Injectable()
export class CartPricer {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async price(items: readonly CartItem[]): Promise<PricedCart> {
    // Ids únicos: si hay la misma prenda en tallas S y M, se pide UNA vez
    const ids = [...new Set(items.map((item) => item.productId))];
    const products = await this.productRepository.findByIds(ids);
    const productsById = new Map<string, Product>(
      products.map((product) => [product.id, product]),
    );
    return priceCart(items, productsById);
  }
}
