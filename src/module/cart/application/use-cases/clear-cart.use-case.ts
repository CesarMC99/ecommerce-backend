import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { Cart } from '../../domain/entities/cart.entity';
import type { CartRepository } from '../../domain/repositories/cart.repository';
import type { PricedCart } from '../../domain/services/cart-pricing';
import { CartPricer } from '../services/cart-pricer.service';

/** Use-case: vaciar el carrito (p. ej. tras completar un pedido). */
@Injectable()
export class ClearCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    private readonly cartPricer: CartPricer,
  ) {}

  async execute(userId: string): Promise<PricedCart> {
    const cart =
      (await this.cartRepository.findByUserId(userId)) ?? Cart.empty(userId);
    const saved = await this.cartRepository.save(cart.clear());
    return this.cartPricer.price(saved.items);
  }
}
