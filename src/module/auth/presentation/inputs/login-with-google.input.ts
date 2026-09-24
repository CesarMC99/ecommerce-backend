import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Input de login con Google: el frontend SOLO envía el authorization code.
 * El canje del code y la emisión de tokens propios ocurre en el backend.
 */
@InputType()
export class LoginWithGoogleInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'El code es obligatorio' })
  code: string;
}
