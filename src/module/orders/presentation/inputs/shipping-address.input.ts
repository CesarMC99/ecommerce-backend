import { Field, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Quita espacios al principio y al final ("  Calle Mayor " → "Calle Mayor"). */
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Dirección de envío. Aquí solo se valida la FORMA de cada campo; lo que
 * depende de otros datos (¿esa ciudad existe en ese país?, ¿ese teléfono
 * es válido allí?) lo comprueba StartCheckoutUseCase con el directorio de
 * ubicaciones. Nada de precios: el total lo calcula siempre el servidor.
 */
@InputType()
export class ShippingAddressInput {
  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Indica el nombre completo' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  fullName: string;

  @Field({ description: 'Número nacional o internacional; solo cifras' })
  @Transform(trim)
  @IsString()
  // Solo cifras, espacios y un "+" inicial: nada de letras
  @Matches(/^\+?[\d\s]{6,20}$/, { message: 'El teléfono solo admite números' })
  phone: string;

  @Field({ description: 'Calle, número, piso...' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Indica la dirección' })
  @MaxLength(150, { message: 'La dirección no puede superar 150 caracteres' })
  line1: string;

  @Field({ description: 'Ciudad elegida del listado (searchCities)' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Elige una ciudad' })
  @MaxLength(100)
  city: string;

  @Field({ description: 'Código ISO del país (shippingCountries)' })
  @IsString()
  @Length(2, 2, { message: 'Elige un país' })
  country: string;
}

@InputType()
export class CheckoutInput {
  @Field({ description: 'Correo para el recibo; puede no ser el de la cuenta' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Introduce un correo válido' })
  @MaxLength(254)
  email: string;

  @Field(() => ShippingAddressInput)
  @ValidateNested()
  @Type(() => ShippingAddressInput)
  shippingAddress: ShippingAddressInput;
}
