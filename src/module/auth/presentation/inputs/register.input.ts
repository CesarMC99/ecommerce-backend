import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Input de registro. class-validator + el ValidationPipe global validan
 * ANTES de llegar al resolver: los use-cases reciben datos ya saneados.
 */
@InputType()
export class RegisterInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  name: string;

  @Field()
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    // bcrypt solo procesa los primeros 72 bytes: aceptar más sería engañoso
    message: 'La contraseña no puede superar 72 caracteres',
  })
  password: string;
}
