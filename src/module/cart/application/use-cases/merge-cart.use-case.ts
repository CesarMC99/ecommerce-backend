import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY } from '../../../../common/constants/injection-tokens';
import { Cart, type CartItem } from '../../domain/entities/cart.entity';
import type { CartRepository } from '../../domain/repositories/cart.repository';
import type { PricedCart } from '../../domain/services/cart-pricing';
import { CartPricer } from '../services/cart-pricer.service';

/**
 * Use-case: al iniciar sesión, el carrito de invitado (el del navegador)
 * se fusiona con el de la cuenta.
 *
 * Las líneas del invitado que ya NO se pueden comprar (producto borrado,
 * talla agotada...) se descartan en silencio: el usuario no pidió esta
 * operación explícitamente, no tiene sentido darle un error por ella.
 */
@Injectable()
export class MergeCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    private readonly cartPricer: CartPricer,
  ) {}

  async execute(userId: string, guestItems: CartItem[]): Promise<PricedCart> {
    // Se reutiliza el cálculo de precios para saber qué líneas son válidas
    const pricedGuest = await this.cartPricer.price(guestItems);
    const validGuestItems = pricedGuest.lines
      .filter((line) => line.unavailableReason === null)
      .map(({ productId, size, quantity }) => ({ productId, size, quantity }));

    const cart =
      (await this.cartRepository.findByUserId(userId)) ?? Cart.empty(userId);
    const saved = await this.cartRepository.save(cart.merge(validGuestItems));
    return this.cartPricer.price(saved.items);
  }
}
