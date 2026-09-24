import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductCategory } from '../../domain/entities/product.entity';
import { ProductSort } from '../../domain/repositories/product.repository';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../application/use-cases/list-products.use-case';

/**
 * Filtros del catálogo. Todos opcionales.
 *
 * IMPORTANTE: el ValidationPipe global usa `forbidNonWhitelisted`, así que
 * CADA campo necesita al menos un decorador de class-validator. Un campo
 * sin decorador se consideraría "no permitido" y la petición fallaría.
 */
@InputType()
export class ProductFilterInput {
  @Field(() => ProductCategory, { nullable: true })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @Field({ nullable: true, description: 'Nombre del color, p. ej. Camel' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El color no puede superar 50 caracteres' })
  color?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Precio máximo en céntimos (incluido)',
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'El precio máximo no puede ser negativo' })
  maxPrice?: number;

  @Field({ nullable: true, description: 'Solo productos rebajados' })
  @IsOptional()
  @IsBoolean()
  onSale?: boolean;

  @Field({ nullable: true, description: 'Solo productos destacados' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

/**
 * Argumentos de la query `products`.
 * @ArgsType agrupa varios argumentos en una clase: así pasan por el
 * ValidationPipe (los argumentos sueltos de tipo primitivo NO se validan)
 */
@ArgsType()
export class ProductsArgs {
  @Field(() => ProductFilterInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  // Sin @Type, class-validator no sabría convertir el objeto plano en
  // ProductFilterInput y no validaría sus campos internos
  @Type(() => ProductFilterInput)
  filter?: ProductFilterInput;

  @Field(() => ProductSort, { defaultValue: ProductSort.FEATURED })
  @IsEnum(ProductSort)
  sort: ProductSort = ProductSort.FEATURED;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1, { message: 'La página debe ser 1 o mayor' })
  page: number = 1;

  @Field(() => Int, { defaultValue: DEFAULT_PAGE_SIZE })
  @IsInt()
  @Min(1, { message: 'El tamaño de página debe ser 1 o mayor' })
  @Max(MAX_PAGE_SIZE, {
    message: `El tamaño de página no puede superar ${MAX_PAGE_SIZE}`,
  })
  pageSize: number = DEFAULT_PAGE_SIZE;
}
