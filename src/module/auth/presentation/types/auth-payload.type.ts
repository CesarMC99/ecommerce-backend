import { Field, ObjectType } from '@nestjs/graphql';
import { UserType } from '../../../users/presentation/types/user.type';

/**
 * Respuesta de las mutaciones de autenticación.
 *
 * Nótese que NO incluye el refresh token: ese viaja exclusivamente en una
 * cookie httpOnly que el JavaScript del navegador no puede leer (protección
 * frente a XSS). Al no estar en el schema, es imposible exponerlo por error.
 */
@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field(() => UserType)
  user: UserType;
}
