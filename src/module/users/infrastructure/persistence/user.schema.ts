import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../domain/entities/user.entity';

/**
 * Schema de Mongoose para User (detalle de infraestructura).
 * La entidad de dominio NO conoce este archivo; el mapper traduce entre ambos.
 */

@Schema({ _id: false })
class OAuthAccountSchema {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  providerId: string;
}

@Schema({ collection: 'users', timestamps: true })
export class UserDocument {
  @Prop({ required: true, trim: true })
  name: string;

  // unique crea un índice único: la BD garantiza que no haya emails duplicados
  // aunque lleguen dos registros concurrentes (la validación en código no basta)
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // null para usuarios que solo tienen login social
  @Prop({ type: String, default: null })
  passwordHash: string | null;

  @Prop({ type: [String], default: ['customer'] })
  roles: Role[];

  @Prop({
    type: [SchemaFactory.createForClass(OAuthAccountSchema)],
    default: [],
  })
  oauthAccounts: OAuthAccountSchema[];

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  // Lo añade { timestamps: true }; se declara para tiparlo
  createdAt: Date;
}

export type UserDoc = HydratedDocument<UserDocument>;

export const UserSchema = SchemaFactory.createForClass(UserDocument);

// Índice compuesto para el lookup de login social: findByOAuthAccount
UserSchema.index({
  'oauthAccounts.provider': 1,
  'oauthAccounts.providerId': 1,
});
