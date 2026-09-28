import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class RequestPasswordResetInput {
  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Introduce un correo válido' })
  @MaxLength(254)
  email: string;
}

/** Mismas reglas de contraseña que el registro y el perfil. */
@InputType()
export class ResetPasswordInput {
  @Field({ description: 'Token del enlace del correo' })
  @IsString()
  @IsNotEmpty({ message: 'Falta el enlace de recuperación' })
  @MaxLength(200)
  token: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    // bcrypt solo procesa los primeros 72 bytes: aceptar más sería engañoso
    message: 'La contraseña no puede superar 72 caracteres',
  })
  newPassword: string;
}
