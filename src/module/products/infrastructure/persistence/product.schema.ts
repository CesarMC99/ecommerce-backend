import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';

/**
 * Schema de Mongoose para Product (detalle de infraestructura).
 * La entidad de dominio NO conoce este archivo; el mapper traduce entre ambos.
 */

@Schema({ _id: false })
class ProductColorSchema {
  @Prop({ required: true, trim: true })
  name: string;

  // Valida el formato en la BD: un hex mal escrito rompería el swatch de color
  @Prop({ required: true, match: /^#[0-9a-fA-F]{6}$/ })
  hex: string;
}

@Schema({ _id: false })
class ProductSizeStockSchema {
  @Prop({ required: true, trim: true })
  size: string;

  // min: 0 → la base de datos rechaza un stock negativo aunque falle el código
  @Prop({ required: true, min: 0, default: 0 })
  stock: number;
}

@Schema({ _id: false })
class ProductImageSchema {
  @Prop({ required: true })
  publicId: string;

  @Prop({ required: true, trim: true })
  alt: string;

  @Prop({ required: true, min: 1 })
  width: number;

  @Prop({ required: true, min: 1 })
  height: number;
}

@Schema({ collection: 'products', timestamps: true })
export class ProductDocument {
  // unique crea un índice único: dos productos no pueden compartir URL
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  // Céntimos enteros. `min: 0` evita precios negativos por error
  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: Number, default: null, min: 0 })
  compareAtPrice: number | null;

  // enum: la BD solo acepta estos valores (no "mujer", "Mujeres"...)
  @Prop({ type: String, required: true, enum: ProductCategory })
  category: ProductCategory;

  @Prop({ required: true, trim: true })
  type: string;

  @Prop({
    type: SchemaFactory.createForClass(ProductColorSchema),
    required: true,
  })
  color: ProductColorSchema;

  @Prop({
    type: [SchemaFactory.createForClass(ProductSizeStockSchema)],
    default: [],
  })
  sizes: ProductSizeStockSchema[];

  @Prop({
    type: [SchemaFactory.createForClass(ProductImageSchema)],
    default: [],
  })
  images: ProductImageSchema[];

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0, min: 0 })
  reviewsCount: number;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({
    type: String,
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Prop({ type: Date, default: () => new Date() })
  publishedAt: Date;

  // Lo añade { timestamps: true }; se declara para tiparlo
  createdAt: Date;
}

export type ProductDoc = HydratedDocument<ProductDocument>;

export const ProductSchema = SchemaFactory.createForClass(ProductDocument);

// Índices: sin ellos, cada filtro del catálogo recorrería TODA la colección.
// Con 12 productos no se nota; con 50.000, es la diferencia entre 5 ms y 2 s.
// El orden de los campos importa: primero los de igualdad (status, category),
// después los de rango u orden (price, publishedAt...)
ProductSchema.index({ status: 1, category: 1, price: 1 });
ProductSchema.index({ status: 1, publishedAt: -1 });
ProductSchema.index({ status: 1, isFeatured: -1, rating: -1 });
