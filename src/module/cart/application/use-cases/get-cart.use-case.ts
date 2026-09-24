import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { CartRepository } from '../../domain/repositories/cart.repository';
import type { PricedCart } from '../../domain/services/cart-pricing';
import { CartPricer } from '../services/cart-pricer.service';

/** Use-case: el carrito del usuario con sesión, con precios actuales. */
@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    private readonly cartPricer: CartPricer,
  ) {}

  async execute(userId: string): Promise<PricedCart> {
    // Sin carrito guardado = carrito vacío (no es un error)
    const cart = await this.cartRepository.findByUserId(userId);
    return this.cartPricer.price(cart?.items ?? []);
  }
}
