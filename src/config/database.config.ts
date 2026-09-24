import { registerAs } from '@nestjs/config';

/**
 * Configuración de la conexión a MongoDB.
 * La URI vive en el .env para no exponer credenciales en el código.
 */
export const databaseConfig = registerAs('database', () => ({
  uri: process.env.DATABASE_URI ?? 'mongodb://localhost:27017/ecommerce',
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
