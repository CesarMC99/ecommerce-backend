import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** Un documento por usuario con los ids de sus favoritos (más reciente primero). */
@Schema({ collection: 'favorites', timestamps: true })
export class FavoriteListDocument {
  // unique: una sola lista por usuario, garantizado por la base de datos
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  productIds: Types.ObjectId[];
}

export type FavoriteListDoc = HydratedDocument<FavoriteListDocument>;

export const FavoriteListSchema =
  SchemaFactory.createForClass(FavoriteListDocument);
