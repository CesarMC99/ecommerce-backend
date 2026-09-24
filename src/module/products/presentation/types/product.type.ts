import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';
import { ProductSort } from '../../domain/repositories/product.repository';

// Los enums del dominio se registran en GraphQL tal cual: una sola
// definición para ambos mundos (y Codegen los genera en el frontend)
registerEnumType(ProductCategory, {
  name: 'ProductCategory',
  description: 'Categoría principal del producto',
});
registerEnumType(ProductStatus, { name: 'ProductStatus' });
registerEnumType(ProductSort, {
  name: 'ProductSort',
  description: 'Orden del catálogo',
});

@ObjectType('ProductColor')
export class ProductColorType {
  @Field()
  name: string;

  @Field({ description: 'Color en hexadecimal, p. ej. #c8a06a' })
  hex: string;
}

@ObjectType('ProductSize')
export class ProductSizeType {
  @Field()
  size: string;

  // Se expone si HAY stock, no CUÁNTO: la tienda solo necesita saber si la
  // talla se puede comprar, y el número exacto es información de negocio
  @Field({ description: 'true si queda al menos una unidad de esta talla' })
  inStock: boolean;
}

@ObjectType('ProductImage')
export class ProductImageType {
  @Field({ description: 'Identificador de la imagen en Cloudinary' })
  publicId: string;

  @Field()
  alt: string;

  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;
}

/**
 * Representación GraphQL del producto.
 * Incluye campos CALCULADOS por la entidad (discountPercentage, isNew,
 * inStock) para que el frontend no tenga que duplicar reglas de negocio.
 */
@ObjectType('Product')
export class ProductType {
  @Field(() => ID)
  id: string;

  @Field()
  slug: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => [String], {
    description: 'Datos de la ficha: composición, cuidados, origen...',
  })
  details: string[];

  @Field(() => Int, { description: 'Precio en céntimos (18900 = 189,00 €)' })
  price: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Precio anterior en céntimos, solo si está rebajado',
  })
  compareAtPrice: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Porcentaje de descuento redondeado (21 = -21%)',
  })
  discountPercentage: number | null;

  @Field({ description: 'Publicado hace 30 días o menos' })
  isNew: boolean;

  @Field(() => ProductCategory)
  category: ProductCategory;

  @Field()
  type: string;

  @Field(() => ProductColorType)
  color: ProductColorType;

  @Field(() => [ProductSizeType])
  sizes: ProductSizeType[];

  @Field({ description: 'true si queda stock en alguna talla' })
  inStock: boolean;

  @Field(() => [ProductImageType])
  images: ProductImageType[];

  // Las tarjetas (home, catálogo) solo muestran UNA foto: con este campo
  // no descargan las 2-3 fotos de cada producto para tirar el resto
  @Field(() => ProductImageType, {
    nullable: true,
    description: 'Foto principal (la primera); null si no tiene fotos',
  })
  mainImage: ProductImageType | null;

  @Field(() => Float)
  rating: number;

  @Field(() => Int)
  reviewsCount: number;

  @Field()
  isFeatured: boolean;

  @Field()
  publishedAt: Date;
}

/** Una página del catálogo + los datos para pintar la paginación. */
@ObjectType('ProductPage')
export class ProductPageType {
  @Field(() => [ProductType])
  items: ProductType[];

  @Field(() => Int, { description: 'Total de productos con estos filtros' })
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalPages: number;
}

/** Opciones disponibles para construir los filtros del catálogo. */
@ObjectType('ProductFacets')
export class ProductFacetsType {
  @Field(() => [ProductColorType], { description: 'Colores existentes' })
  colors: ProductColorType[];

  @Field(() => [String], {
    description: 'Tallas con stock, en orden natural (XS → XL, 37 → 41)',
  })
  sizes: string[];

  @Field(() => Int, { description: 'Precio más bajo en céntimos' })
  minPrice: number;

  @Field(() => Int, { description: 'Precio más alto en céntimos' })
  maxPrice: number;
}
