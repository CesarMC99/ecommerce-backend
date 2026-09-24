import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, SortOrder } from 'mongoose';
import { Product, ProductStatus } from '../../domain/entities/product.entity';
import {
  ProductFacets,
  ProductRepository,
  ProductSearchCriteria,
  ProductSearchResult,
  ProductSort,
} from '../../domain/repositories/product.repository';
import { ProductMapper } from '../persistence/product.mapper';
import { ProductDocument } from '../persistence/product.schema';

/**
 * Cómo se traduce cada orden del dominio a un sort de MongoDB.
 *
 * TODOS terminan en `_id`: si dos productos empatan (mismo precio), sin un
 * desempate fijo Mongo puede devolverlos en distinto orden en cada consulta,
 * y al paginar un producto podría salir en la página 1 Y en la 2 (o en
 * ninguna). El _id es único, así que el orden queda siempre determinado.
 */
const SORT_BY: Record<ProductSort, Record<string, SortOrder>> = {
  [ProductSort.FEATURED]: { isFeatured: -1, rating: -1, _id: 1 },
  [ProductSort.NEWEST]: { publishedAt: -1, _id: 1 },
  [ProductSort.PRICE_ASC]: { price: 1, _id: 1 },
  [ProductSort.PRICE_DESC]: { price: -1, _id: 1 },
  [ProductSort.RATING]: { rating: -1, reviewsCount: -1, _id: 1 },
};

/**
 * Coincidencia EXACTA sin distinguir mayúsculas ('camel' = 'Camel').
 * Se escapa el texto para que caracteres como "." o "*" no se interpreten
 * como regex: un usuario podría mandar ".*" y saltarse el filtro.
 */
const exactInsensitive = (value: string) => ({
  $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
  $options: 'i',
});

/** Forma del resultado de la agregación de facetas ($facet). */
interface FacetsAggregation {
  colors: { _id: string; hex: string }[];
  sizes: { _id: string }[];
  prices: { min: number; max: number }[];
}

/**
 * Implementación Mongoose del ProductRepository (adaptador).
 * Se registra en ProductsModule bajo el token PRODUCT_REPOSITORY.
 */
@Injectable()
export class ProductRepositoryImpl implements ProductRepository {
  constructor(
    @InjectModel(ProductDocument.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async findMany(
    criteria: ProductSearchCriteria,
  ): Promise<ProductSearchResult> {
    const filter = this.buildFilter(criteria);

    // Las dos consultas son independientes: Promise.all las lanza a la vez
    // en lugar de esperar a que termine una para empezar la otra
    const [docs, totalCount] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(SORT_BY[criteria.sort])
        .skip((criteria.page - 1) * criteria.pageSize)
        .limit(criteria.pageSize)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => ProductMapper.toDomain(doc)),
      totalCount,
    };
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const doc = await this.productModel.findOne({ slug }).exec();
    return doc ? ProductMapper.toDomain(doc) : null;
  }

  async findFacets(status: ProductStatus): Promise<ProductFacets> {
    // $facet ejecuta VARIAS agregaciones sobre los mismos documentos en una
    // sola ida y vuelta a la base de datos (en vez de 3 consultas)
    const [result] = await this.productModel
      .aggregate<FacetsAggregation>([
        { $match: { status } },
        {
          $facet: {
            // Un color por nombre (con su hex) → las bolitas de color
            colors: [
              { $group: { _id: '$color.name', hex: { $first: '$color.hex' } } },
            ],
            // $unwind "despliega" el array de tallas: un documento por talla.
            // Solo cuentan tallas CON stock: ofrecer una talla agotada en el
            // filtro llevaría a "sin resultados"
            sizes: [
              { $unwind: '$sizes' },
              { $match: { 'sizes.stock': { $gt: 0 } } },
              { $group: { _id: '$sizes.size' } },
            ],
            prices: [
              {
                $group: {
                  _id: null,
                  min: { $min: '$price' },
                  max: { $max: '$price' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    return {
      colors: result.colors.map((color) => ({
        name: color._id,
        hex: color.hex,
      })),
      sizes: result.sizes.map((size) => size._id),
      // Catálogo vacío → no hay grupo de precios: se devuelve 0
      minPrice: result.prices[0]?.min ?? 0,
      maxPrice: result.prices[0]?.max ?? 0,
    };
  }

  /** Solo se añade al filtro lo que viene definido: sin filtros = todo. */
  private buildFilter(
    criteria: ProductSearchCriteria,
  ): QueryFilter<ProductDocument> {
    const filter: QueryFilter<ProductDocument> = {};

    if (criteria.status) filter.status = criteria.status;
    if (criteria.category) filter.category = criteria.category;
    if (criteria.featured) filter.isFeatured = true;
    if (criteria.excludeSlug) filter.slug = { $ne: criteria.excludeSlug };
    if (criteria.maxPrice !== undefined) {
      filter.price = { $lte: criteria.maxPrice };
    }
    if (criteria.minRating !== undefined) {
      filter.rating = { $gte: criteria.minRating };
    }
    if (criteria.color) {
      filter['color.name'] = exactInsensitive(criteria.color);
    }
    if (criteria.size) {
      // $elemMatch: la MISMA entrada del array debe ser esa talla Y tener
      // stock. Sin él, un producto con "M agotada" y "S con stock" pasaría
      // el filtro de la M (una condición la cumple una talla y otra, otra)
      filter.sizes = {
        $elemMatch: {
          size: exactInsensitive(criteria.size),
          stock: { $gt: 0 },
        },
      };
    }
    if (criteria.onSale) {
      // Misma regla que Product.isOnSale(): hay precio anterior Y es mayor.
      // $expr permite comparar dos campos del MISMO documento entre sí
      filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
    }

    return filter;
  }
}
