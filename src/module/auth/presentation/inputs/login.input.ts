import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** Input de login con credenciales locales. */
@InputType()
export class LoginInput {
  @Field()
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
