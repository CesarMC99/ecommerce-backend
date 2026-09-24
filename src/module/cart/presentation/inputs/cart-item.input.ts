import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsInt,
  IsMongoId,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_CART_LINES,
  MAX_QUANTITY_PER_LINE,
} from '../../domain/entities/cart.entity';

/**
 * Una línea del carrito tal como la envía el cliente. OJO: sin precio.
 * Aunque el cliente lo enviara, no existe el campo: el ValidationPipe
 * (forbidNonWhitelisted) rechazaría la petición entera.
 */
@InputType()
export class CartItemInput {
  @Field()
  // IsMongoId: rechaza ids con formato inválido antes de tocar la base de datos
  @IsMongoId({ message: 'El producto no es válido' })
  productId: string;

  @Field()
  @IsString()
  @MaxLength(10, { message: 'La talla no puede superar 10 caracteres' })
  size: string;

  @Field(() => Int)
  @IsInt()
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(MAX_QUANTITY_PER_LINE, {
    message: `La cantidad máxima es ${MAX_QUANTITY_PER_LINE}`,
  })
  quantity: number;
}

/** Cambiar la cantidad: igual que CartItemInput pero admite 0 (= quitar). */
@InputType()
export class UpdateCartItemInput {
  @Field()
  @IsMongoId({ message: 'El producto no es válido' })
  productId: string;

  @Field()
  @IsString()
  @MaxLength(10, { message: 'La talla no puede superar 10 caracteres' })
  size: string;

  @Field(() => Int, { description: '0 elimina la línea' })
  @IsInt()
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  @Max(MAX_QUANTITY_PER_LINE, {
    message: `La cantidad máxima es ${MAX_QUANTITY_PER_LINE}`,
  })
  quantity: number;
}

/**
 * Lista de líneas (presupuesto de invitado y fusión). ArrayMaxSize evita
 * que alguien envíe 100.000 líneas para saturar el servidor.
 */
@ArgsType()
export class CartItemsArgs {
  @Field(() => [CartItemInput])
  @ArrayMaxSize(MAX_CART_LINES, {
    message: `El carrito no puede tener más de ${MAX_CART_LINES} líneas`,
  })
  @ValidateNested({ each: true })
  @Type(() => CartItemInput)
  items: CartItemInput[];
}
