import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import {
  appConfig,
  cloudinaryConfig,
  databaseConfig,
  emailConfig,
  googleOAuthConfig,
  jwtConfig,
  stripeConfig,
} from './config';
import { AuthModule } from './module/auth/auth.module';
import { CartModule } from './module/cart/cart.module';
import { FavoritesModule } from './module/favorites/favorites.module';
import { OrdersModule } from './module/orders/orders.module';
import { ProductsModule } from './module/products/products.module';
import { UsersModule } from './module/users/users.module';

@Module({
  imports: [
    // isGlobal: cualquier módulo puede inyectar la config sin re-importar
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        googleOAuthConfig,
        stripeConfig,
        // Cloudinary: el correo del pedido construye las URLs de las fotos
        cloudinaryConfig,
        emailConfig,
      ],
    }),

    // forRootAsync: la URI se lee de la config (no hardcodeada)
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      // Exponemos req/res en el contexto GraphQL: los resolvers de auth los
      // necesitan para leer/escribir la cookie httpOnly del refresh token
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
    }),

    UsersModule,
    AuthModule,
    ProductsModule,
    CartModule,
    FavoritesModule,
    OrdersModule,
  ],
  controllers: [AppController],

  providers: [
    AppService,
    // Filtro global: traduce las excepciones de Nest/dominio a errores
    // GraphQL con un `code` consistente para que el frontend pueda reaccionar
    { provide: APP_FILTER, useClass: GraphqlExceptionFilter },
  ],
})
export class AppModule {}
