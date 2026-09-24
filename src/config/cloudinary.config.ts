import { registerAs } from '@nestjs/config';

/**
 * Configuración de Cloudinary (almacenamiento y CDN de imágenes).
 *
 * El apiSecret firma las peticiones a Cloudinary: con él se puede subir y
 * borrar cualquier imagen de la cuenta. Por eso vive SOLO en el backend;
 * el frontend únicamente conoce el cloudName (para construir URLs).
 */
export const cloudinaryConfig = registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  apiKey: process.env.CLOUDINARY_API_KEY ?? '',
  apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
}));

export type CloudinaryConfig = ReturnType<typeof cloudinaryConfig>;

/**
 * Carpeta de Cloudinary donde viven las fotos de producto. Centralizada
 * aquí para que el seed y la futura subida desde el admin usen la misma.
 */
export const PRODUCT_IMAGES_FOLDER = 'ambar/products';

/**
 * Imágenes de la TIENDA (hero, categorías, banners): no pertenecen a ningún
 * producto, así que no se guardan en MongoDB. El frontend las referencia
 * por su publicId fijo (ambar/site/hero...)
 */
export const SITE_IMAGES_FOLDER = 'ambar/site';
