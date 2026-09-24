import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CART_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../../../../common/constants/injection-tokens';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository';
import { Cart, type CartItem } from '../../domain/entities/cart.entity';
import type { CartRepository } from '../../domain/repositories/cart.repository';
import {
  getUnavailableReason,
  type PricedCart,
} from '../../domain/services/cart-pricing';
import { CartPricer } from '../services/cart-pricer.service';

/**
 * Use-case: añadir un producto (en una talla) al carrito del usuario.
 *
 * Se valida ANTES de guardar: no tiene sentido llenar el carrito de
 * productos que no se pueden comprar. Los mensajes son para el usuario.
 */
@Injectable()
export class AddCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    private readonly cartPricer: CartPricer,
  ) {}

  async execute(userId: string, item: CartItem): Promise<PricedCart> {
    const [product] = await this.productRepository.findByIds([item.productId]);

    switch (getUnavailableReason(product ?? null, item.size)) {
      case 'PRODUCT_NOT_FOUND':
      case 'PRODUCT_UNAVAILABLE':
        throw new NotFoundException('Este producto ya no está disponible');
      case 'SIZE_NOT_FOUND':
        throw new BadRequestException('Esa talla no existe para este producto');
      case 'OUT_OF_STOCK':
        throw new BadRequestException('Esa talla está agotada');
    }

    const cart =
      (await this.cartRepository.findByUserId(userId)) ?? Cart.empty(userId);
    const saved = await this.cartRepository.save(cart.addItem(item));
    return this.cartPricer.price(saved.items);
  }
}
