import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * Representación GraphQL del usuario (capa de presentación).
 *
 * Deliberadamente NO expone passwordHash ni oauthAccounts: lo que no está
 * aquí no existe en el schema GraphQL, así que es imposible filtrarlo.
 */
@ObjectType('User')
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(() => [String])
  roles: string[];

  @Field(() => String, { nullable: true })
  avatarUrl: string | null;

  @Field()
  createdAt: Date;
}
