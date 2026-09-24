import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { appConfig } from './config';
import type { AppConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {});

  // Config tipada: appConfig.KEY es un token de inyección que el contenedor
  // de Nest resuelve al objeto ya parseado (en lugar de leer process.env)
  const config = app.get<AppConfig>(appConfig.KEY);

  // Necesario para leer la cookie httpOnly donde viaja el refresh token
  app.use(cookieParser());

  // CORS con credentials: sin esto el navegador no envía/acepta cookies
  // desde el frontend (que corre en otro origen: localhost:4000)
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: descarta propiedades que no están en el DTO
      whitelist: true,
      // forbidNonWhitelisted: además de descartar, rechaza la petición
      forbidNonWhitelisted: true,
      // transform: convierte el payload plano en instancias de los DTOs
      transform: true,
    }),
  );

  await app.listen(config.port);
}
// `void`: marca explícitamente que no esperamos esta promesa (regla de lint)
void bootstrap();
