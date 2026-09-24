import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProductType } from '../../../products/presentation/types/product.type';

/** Por qué una línea no se puede comprar (la UI lo explica al usuario). */
export enum CartLineUnavailableReason {
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
  SIZE_NOT_FOUND = 'SIZE_NOT_FOUND',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

registerEnumType(CartLineUnavailableReason, {
  name: 'CartLineUnavailableReason',
});

@ObjectType('CartLine')
export class CartLineType {
  @Field()
  productId: string;

  // null si el producto se borró: la línea se devuelve igualmente para
  // poder mostrar "este producto ya no existe" y dejar que se quite
  @Field(() => ProductType, { nullable: true })
  product: ProductType | null;

  @Field()
  size: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int, { description: 'Precio unitario actual en céntimos' })
  unitPrice: number;

  @Field(() => Int, { description: 'Precio × cantidad, en céntimos' })
  lineTotal: number;

  @Field(() => Int, { description: 'Máximo de unidades comprables' })
  maxQuantity: number;

  @Field(() => CartLineUnavailableReason, {
    nullable: true,
    description: 'null si la línea se puede comprar',
  })
  unavailableReason: CartLineUnavailableReason | null;
}

/** Carrito con todos los importes ya calculados por el backend. */
@ObjectType('Cart')
export class CartType {
  @Field(() => [CartLineType])
  lines: CartLineType[];

  @Field(() => Int, {
    description: 'Unidades disponibles (contador del header)',
  })
  itemCount: number;

  @Field(() => Int, {
    description: 'Suma de las líneas disponibles, en céntimos',
  })
  subtotal: number;

  @Field(() => Int, {
    description: 'Lo que se ahorra por rebajas, en céntimos',
  })
  savings: number;

  @Field(() => Int, { description: 'Coste de envío en céntimos (0 = gratis)' })
  shipping: number;

  @Field(() => Int, { description: 'Subtotal + envío, en céntimos' })
  total: number;

  @Field(() => Int, {
    description:
      'Lo que falta para el envío gratis, en céntimos (0 = ya lo tiene)',
  })
  amountToFreeShipping: number;
}
