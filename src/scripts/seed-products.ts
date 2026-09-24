import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDocument } from '../module/products/infrastructure/persistence/product.schema';
import { PRODUCTS_SEED } from '../module/products/infrastructure/seed/products.seed-data';
import { SeedDatabaseModule } from './seed-database.module';

/**
 * Script de seed: carga el catálogo inicial en MongoDB.
 *
 * Uso: pnpm seed:products
 *
 * Es IDEMPOTENTE: se puede ejecutar las veces que haga falta. Usa "upsert"
 * por slug → si el producto existe lo actualiza, si no, lo crea. Nunca
 * duplica productos. NO toca las imágenes (eso es seed:images), así que
 * re-ejecutarlo no borra las fotos ya asociadas.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function seed() {
  const logger = new Logger('SeedProducts');
  const app = await NestFactory.createApplicationContext(SeedDatabaseModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const productModel = app.get<Model<ProductDocument>>(
      getModelToken(ProductDocument.name),
    );

    // Crea los índices del schema (slug único, índices del catálogo) ANTES
    // de insertar: así el índice único protege también a este script
    await productModel.syncIndexes();

    const now = Date.now();
    for (const { publishedDaysAgo, ...product } of PRODUCTS_SEED) {
      await productModel.updateOne(
        { slug: product.slug },
        {
          $set: {
            ...product,
            publishedAt: new Date(now - publishedDaysAgo * MS_PER_DAY),
          },
        },
        // runValidators: sin esto, updateOne se saltaría las validaciones
        // del schema (enum, min...) y podría guardar datos inválidos
        { upsert: true, runValidators: true },
      );
    }

    const total = await productModel.countDocuments();
    logger.log(
      `✓ ${PRODUCTS_SEED.length} productos sincronizados (${total} en la colección)`,
    );
  } finally {
    // Cierra la conexión aunque algo falle: si no, el proceso se quedaría
    // colgado con la conexión a Mongo abierta
    await app.close();
  }
}

seed().catch((error: unknown) => {
  new Logger('SeedProducts').error(error);
  process.exit(1);
});
