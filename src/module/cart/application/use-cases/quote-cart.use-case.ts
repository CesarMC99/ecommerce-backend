import { Injectable } from '@nestjs/common';
import { Cart, type CartItem } from '../../domain/entities/cart.entity';
import type { PricedCart } from '../../domain/services/cart-pricing';
import { CartPricer } from '../services/cart-pricer.service';

/**
 * Use-case: "presupuesto" del carrito de un INVITADO.
 *
 * El invitado guarda su carrito en el navegador (sin precios) y lo envía
 * aquí para recibirlo calculado. No se guarda nada. Así invitados y
 * usuarios con sesión ven EXACTAMENTE el mismo cálculo, y el navegador
 * nunca decide un precio.
 */
@Injectable()
export class QuoteCartUseCase {
  constructor(private readonly cartPricer: CartPricer) {}

  execute(items: CartItem[]): Promise<PricedCart> {
    // Se normaliza con las MISMAS reglas que un carrito guardado: líneas
    // repetidas se suman, cantidades acotadas y máximo de líneas. Un
    // carrito manipulado a mano en el navegador no se salta los límites
    const normalized = Cart.empty('guest').merge(items);
    return this.cartPricer.price(normalized.items);
  }
}
