import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** Un enlace de "restablecer contraseña". Solo guarda el HASH del token. */
@Schema({ collection: 'password_reset_tokens', timestamps: true })
export class PasswordResetTokenDocument {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  /** Cuándo se usó (null = aún no). Un enlace solo vale UNA vez */
  @Prop({ type: Date, default: null })
  usedAt: Date | null;

  createdAt: Date;
}

export type PasswordResetTokenDoc =
  HydratedDocument<PasswordResetTokenDocument>;

export const PasswordResetTokenSchema = SchemaFactory.createForClass(
  PasswordResetTokenDocument,
);

// Índice TTL: MongoDB borra solo los documentos 1 día después de caducar.
// Los enlaces duran minutos: no hay motivo para guardarlos más
PasswordResetTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 24 * 60 * 60 },
);
