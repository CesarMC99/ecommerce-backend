import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Schema de Mongoose para los refresh tokens (sesiones).
 * Solo guarda el HASH del token, nunca el token en claro.
 */
@Schema({ collection: 'refresh_tokens', timestamps: true })
export class RefreshTokenDocument {
  @Prop({
    type: Types.ObjectId,
    ref: 'UserDocument',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  // unique + index: el lookup del refresh es SIEMPRE por hash, debe ser rápido
  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: String, default: null })
  replacedByTokenHash: string | null;

  createdAt: Date;
}

export type RefreshTokenDoc = HydratedDocument<RefreshTokenDocument>;

export const RefreshTokenSchema =
  SchemaFactory.createForClass(RefreshTokenDocument);

// Índice TTL: MongoDB borra automáticamente los documentos 30 días después
// de su expiración (se conservan un tiempo para poder detectar reuso)
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
