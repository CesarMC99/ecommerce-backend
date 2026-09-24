import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { cloudinaryConfig, databaseConfig } from '../config';
import {
  ProductDocument,
  ProductSchema,
} from '../module/products/infrastructure/persistence/product.schema';

/**
 * "Mini aplicación" para los scripts de seed: solo config + MongoDB, sin
 * servidor HTTP ni GraphQL. La comparten seed:products y seed:images para
 * no repetir la configuración de la conexión (DRY).
 *
 * Reutiliza el MISMO schema que la app: las validaciones del schema (enums,
 * mínimos, formatos) también protegen los datos que cargan los scripts.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, cloudinaryConfig],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
    }),
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
    ]),
  ],
})
export class SeedDatabaseModule {}
