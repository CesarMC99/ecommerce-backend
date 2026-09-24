import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { existsSync, readdirSync, statSync } from 'fs';
import { Model } from 'mongoose';
import { join } from 'path';
import {
  cloudinaryConfig,
  PRODUCT_IMAGES_FOLDER,
  SITE_IMAGES_FOLDER,
  type CloudinaryConfig,
} from '../config';
import type { ProductImage } from '../module/products/domain/entities/product.entity';
import { ProductDocument } from '../module/products/infrastructure/persistence/product.schema';
import { SeedDatabaseModule } from './seed-database.module';

/**
 * Script: sube las fotos locales a Cloudinary.
 *
 * Uso: pnpm seed:images
 *
 * Lee dos carpetas (ambas fuera de git, en `seed-images/`):
 *
 * - `products/`: `<slug>-<número>.<ext>` (abrigo-de-lana-1.jpg). Se suben y
 *   se ASOCIAN al producto en MongoDB. La foto 1 es la principal.
 * - `site/`: `<nombre>.<ext>` (hero.jpg, categoria-mujer.jpg). Imágenes de
 *   la tienda: solo se suben; el frontend las usa por su publicId fijo.
 *
 * Es IDEMPOTENTE: cada foto se sube con un publicId FIJO y `overwrite: true`,
 * así que volver a ejecutarlo reemplaza las fotos en vez de duplicarlas.
 */

const SEED_DIR = join(process.cwd(), 'seed-images');
const PRODUCTS_DIR = join(SEED_DIR, 'products');
const SITE_DIR = join(SEED_DIR, 'site');

// slug (minúsculas, números y guiones) + "-" + número + extensión de imagen
const PRODUCT_FILE_PATTERN =
  /^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)\.(jpe?g|png|webp)$/i;
// nombre en minúsculas con guiones + extensión (hero.jpg, categoria-mujer.jpg)
const SITE_FILE_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(jpe?g|png|webp)$/i;

// Las fotos originales pesan hasta 10 MB (7000 px). Se reducen AL SUBIR a un
// máximo de 2000 px: sobra para cualquier pantalla y Cloudinary no guarda
// (ni cobra almacenamiento por) megapíxeles que nunca se van a mostrar
const MAX_STORED_SIZE = 2000;

// Límite de subida del plan gratuito de Cloudinary (10 MB por imagen).
// Se comprueba ANTES de subir para dar un error claro en español en vez del
// "File size too large" de Cloudinary tras esperar a que suba el archivo
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Falla con un mensaje claro si falta alguna credencial en el .env. */
function configureCloudinary(config: CloudinaryConfig) {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de Cloudinary en el .env: ${missing.join(', ')}`,
    );
  }
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
}

/**
 * Sube UNA foto con un publicId fijo. Punto único de subida: productos y
 * tienda comparten exactamente las mismas opciones (DRY).
 */
function uploadImage(
  filePath: string,
  folder: string,
  name: string,
): Promise<UploadApiResponse> {
  const sizeInBytes = statSync(filePath).size;
  if (sizeInBytes > MAX_UPLOAD_BYTES) {
    const sizeInMb = (sizeInBytes / (1024 * 1024)).toFixed(1);
    return Promise.reject(
      new Error(
        `pesa ${sizeInMb} MB y Cloudinary admite hasta 10 MB: ` +
          'redúcela (p. ej. a 3000 px de lado o exportando al 85% de calidad)',
      ),
    );
  }
  return cloudinary.uploader.upload(filePath, {
    public_id: `${folder}/${name}`,
    // Para que aparezca en esa carpeta en la Media Library
    asset_folder: folder,
    overwrite: true,
    // Invalida la caché del CDN: sin esto, al reemplazar una foto se
    // seguiría viendo la antigua durante horas
    invalidate: true,
    transformation: [
      {
        width: MAX_STORED_SIZE,
        height: MAX_STORED_SIZE,
        crop: 'limit', // solo reduce, nunca agranda ni recorta
      },
    ],
  });
}

interface LocalImage {
  fileName: string;
  position: number;
}

/** Agrupa los archivos de producto por slug y los ordena por su número. */
function groupProductImagesBySlug(logger: Logger): Map<string, LocalImage[]> {
  const bySlug = new Map<string, LocalImage[]>();

  for (const fileName of readdirSync(PRODUCTS_DIR)) {
    const match = PRODUCT_FILE_PATTERN.exec(fileName);
    if (!match) {
      // Un nombre mal escrito NO detiene el script: se avisa y se sigue
      logger.warn(`Ignorado (nombre no válido): products/${fileName}`);
      continue;
    }
    const slug = match[1].toLowerCase();
    const images = bySlug.get(slug) ?? [];
    images.push({ fileName, position: Number(match[2]) });
    bySlug.set(slug, images);
  }

  for (const images of bySlug.values()) {
    images.sort((a, b) => a.position - b.position);
  }
  return bySlug;
}

/** Sube las fotos de producto y las asocia en MongoDB. Devuelve los fallos. */
async function seedProductImages(
  productModel: Model<ProductDocument>,
  logger: Logger,
): Promise<number> {
  let failures = 0;

  for (const [slug, localImages] of groupProductImagesBySlug(logger)) {
    const product = await productModel.findOne({ slug }).exec();
    if (!product) {
      logger.warn(`Sin producto con slug "${slug}": se omiten sus fotos`);
      continue;
    }

    try {
      // Las fotos de UN producto se suben en paralelo (son 2-3); los
      // productos, uno detrás de otro, para no saturar la conexión
      const uploaded: ProductImage[] = await Promise.all(
        localImages.map(async ({ fileName, position }) => {
          const result = await uploadImage(
            join(PRODUCTS_DIR, fileName),
            PRODUCT_IMAGES_FOLDER,
            `${slug}-${position}`,
          );
          return {
            publicId: result.public_id,
            alt: `${product.name} en color ${product.color.name}, vista ${position}`,
            // Medidas REALES tras la reducción: el frontend las usa para
            // reservar el hueco de la imagen antes de que cargue
            width: result.width,
            height: result.height,
          };
        }),
      );

      await productModel.updateOne(
        { _id: product._id },
        { $set: { images: uploaded } },
        { runValidators: true },
      );
      logger.log(`✓ products/${slug}: ${uploaded.length} foto(s)`);
    } catch (error) {
      // Un producto que falla no detiene a los demás
      failures++;
      logger.error(`✗ products/${slug}: ${(error as Error).message}`);
    }
  }

  // Avisa de los productos que se quedan sin foto (seguirán mostrando el
  // placeholder de franjas en la tienda)
  const withoutImages = await productModel
    .find({ images: { $size: 0 } }, { slug: 1 })
    .exec();
  if (withoutImages.length > 0) {
    logger.warn(
      `Productos sin fotos: ${withoutImages.map((p) => p.slug).join(', ')}`,
    );
  }

  return failures;
}

/** Sube las imágenes de la tienda (hero, categorías...). Devuelve los fallos. */
async function seedSiteImages(logger: Logger): Promise<number> {
  let failures = 0;

  for (const fileName of readdirSync(SITE_DIR)) {
    const match = SITE_FILE_PATTERN.exec(fileName);
    if (!match) {
      logger.warn(`Ignorado (nombre no válido): site/${fileName}`);
      continue;
    }
    const name = match[1].toLowerCase();
    try {
      const result = await uploadImage(
        join(SITE_DIR, fileName),
        SITE_IMAGES_FOLDER,
        name,
      );
      logger.log(`✓ site/${name} → ${result.public_id}`);
    } catch (error) {
      failures++;
      logger.error(`✗ site/${name}: ${(error as Error).message}`);
    }
  }

  return failures;
}

async function seedImages() {
  const logger = new Logger('SeedImages');

  const hasProducts = existsSync(PRODUCTS_DIR);
  const hasSite = existsSync(SITE_DIR);
  if (!hasProducts && !hasSite) {
    throw new Error(`No hay carpetas products/ ni site/ en ${SEED_DIR}`);
  }

  const app = await NestFactory.createApplicationContext(SeedDatabaseModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    configureCloudinary(app.get<CloudinaryConfig>(cloudinaryConfig.KEY));
    const productModel = app.get<Model<ProductDocument>>(
      getModelToken(ProductDocument.name),
    );

    let failures = 0;
    if (hasProducts) failures += await seedProductImages(productModel, logger);
    if (hasSite) failures += await seedSiteImages(logger);

    if (failures > 0) {
      throw new Error(`${failures} subida(s) fallaron`);
    }
  } finally {
    await app.close();
  }
}

seedImages().catch((error: unknown) => {
  new Logger('SeedImages').error((error as Error).message ?? error);
  process.exit(1);
});
