import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, SortOrder } from 'mongoose';
import { Product } from '../../domain/entities/product.entity';
import {
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
};

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

  /** Solo se añade al filtro lo que viene definido: sin filtros = todo. */
  private buildFilter(
    criteria: ProductSearchCriteria,
  ): QueryFilter<ProductDocument> {
    const filter: QueryFilter<ProductDocument> = {};

    if (criteria.status) filter.status = criteria.status;
    if (criteria.category) filter.category = criteria.category;
    if (criteria.featured) filter.isFeatured = true;
    if (criteria.maxPrice !== undefined) {
      filter.price = { $lte: criteria.maxPrice };
    }
    if (criteria.color) {
      // Insensible a mayúsculas ('camel' = 'Camel'). Se escapa el texto para
      // que caracteres como "." o "*" no se interpreten como regex (un
      // usuario podría mandar ".*" y saltarse el filtro)
      const escaped = criteria.color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['color.name'] = { $regex: `^${escaped}$`, $options: 'i' };
    }
    if (criteria.onSale) {
      // Misma regla que Product.isOnSale(): hay precio anterior Y es mayor.
      // $expr permite comparar dos campos del MISMO documento entre sí
      filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
    }

    return filter;
  }
}
