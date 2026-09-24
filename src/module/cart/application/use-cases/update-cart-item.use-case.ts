import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { Cart, type CartItem } from '../../domain/entities/cart.entity';
import type { CartRepository } from '../../domain/repositories/cart.repository';
import type { PricedCart } from '../../domain/services/cart-pricing';
import { CartPricer } from '../services/cart-pricer.service';

/**
 * Use-case: fijar la cantidad de una línea (los botones − / +).
 * Cantidad 0 elimina la línea: "quitar" es un caso particular de esto.
 */
@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    private readonly cartPricer: CartPricer,
  ) {}

  async execute(userId: string, item: CartItem): Promise<PricedCart> {
    const cart =
      (await this.cartRepository.findByUserId(userId)) ?? Cart.empty(userId);
    const saved = await this.cartRepository.save(
      cart.setQuantity(item, item.quantity),
    );
    return this.cartPricer.price(saved.items);
  }
}
