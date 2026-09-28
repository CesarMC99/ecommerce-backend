import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateProfileInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name: string;
}

/** Mismas reglas de contraseña que el registro (RegisterInput). */
@InputType()
export class ChangePasswordInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Indica tu contraseña actual' })
  currentPassword: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    // bcrypt solo procesa los primeros 72 bytes: aceptar más sería engañoso
    message: 'La contraseña no puede superar 72 caracteres',
  })
  newPassword: string;
}
