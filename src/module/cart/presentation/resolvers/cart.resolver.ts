import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { toProductType } from '../../../products/presentation/product.presenter';
import { AddCartItemUseCase } from '../../application/use-cases/add-cart-item.use-case';
import { ClearCartUseCase } from '../../application/use-cases/clear-cart.use-case';
import { GetCartUseCase } from '../../application/use-cases/get-cart.use-case';
import { MergeCartUseCase } from '../../application/use-cases/merge-cart.use-case';
import { QuoteCartUseCase } from '../../application/use-cases/quote-cart.use-case';
import { UpdateCartItemUseCase } from '../../application/use-cases/update-cart-item.use-case';
import type { PricedCart } from '../../domain/services/cart-pricing';
import {
  CartItemInput,
  CartItemsArgs,
  UpdateCartItemInput,
} from '../inputs/cart-item.input';
import { CartLineUnavailableReason, CartType } from '../types/cart.type';

/**
 * Resolver del carrito.
 *
 * - `cartQuote` es PÚBLICA: la usan los invitados (carrito en el navegador).
 * - El resto exige sesión (JwtAuthGuard) y opera SIEMPRE sobre el carrito
 *   del usuario del token: no existe un argumento "userId", así que es
 *   imposible leer o tocar el carrito de otra persona.
 */
@Resolver(() => CartType)
export class CartResolver {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly mergeCartUseCase: MergeCartUseCase,
    private readonly quoteCartUseCase: QuoteCartUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @Query(() => CartType, {
    description: 'Calcula un carrito de invitado (no guarda nada)',
  })
  async cartQuote(@Args() args: CartItemsArgs): Promise<CartType> {
    return this.toCartType(await this.quoteCartUseCase.execute(args.items));
  }

  @Query(() => CartType, { description: 'Carrito del usuario con sesión' })
  @UseGuards(JwtAuthGuard)
  async myCart(@CurrentUser() user: AuthenticatedUser): Promise<CartType> {
    return this.toCartType(await this.getCartUseCase.execute(user.userId));
  }

  @Mutation(() => CartType, { description: 'Añade unidades de un producto' })
  @UseGuards(JwtAuthGuard)
  async addToCart(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: CartItemInput,
  ): Promise<CartType> {
    return this.toCartType(
      await this.addCartItemUseCase.execute(user.userId, input),
    );
  }

  @Mutation(() => CartType, {
    description: 'Fija la cantidad de una línea (0 la elimina)',
  })
  @UseGuards(JwtAuthGuard)
  async updateCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @Args('input') input: UpdateCartItemInput,
  ): Promise<CartType> {
    return this.toCartType(
      await this.updateCartItemUseCase.execute(user.userId, input),
    );
  }

  @Mutation(() => CartType, {
    description: 'Fusiona el carrito de invitado con el de la cuenta',
  })
  @UseGuards(JwtAuthGuard)
  async mergeCart(
    @CurrentUser() user: AuthenticatedUser,
    @Args() args: CartItemsArgs,
  ): Promise<CartType> {
    return this.toCartType(
      await this.mergeCartUseCase.execute(user.userId, args.items),
    );
  }

  @Mutation(() => CartType, { description: 'Vacía el carrito' })
  @UseGuards(JwtAuthGuard)
  async clearCart(@CurrentUser() user: AuthenticatedUser): Promise<CartType> {
    return this.toCartType(await this.clearCartUseCase.execute(user.userId));
  }

  /** Carrito calculado (dominio) → tipo GraphQL. Punto único de traducción. */
  private toCartType(cart: PricedCart): CartType {
    return {
      ...cart,
      lines: cart.lines.map((line) => ({
        productId: line.productId,
        product: line.product ? toProductType(line.product) : null,
        size: line.size,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        maxQuantity: line.maxQuantity,
        unavailableReason: line.unavailableReason
          ? CartLineUnavailableReason[line.unavailableReason]
          : null,
      })),
    };
  }
}
