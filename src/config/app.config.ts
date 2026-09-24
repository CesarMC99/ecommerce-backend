import { registerAs } from '@nestjs/config';

/**
 * Configuración general de la aplicación.
 *
 * Usamos `registerAs` para que la config quede "namespaced" (app.*) y tipada:
 * los consumidores la inyectan con `@Inject(appConfig.KEY)` en lugar de leer
 * process.env directamente, lo que centraliza defaults y facilita testear.
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  // Origen del frontend permitido por CORS (necesario para enviar cookies)
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4000',
}));

export type AppConfig = ReturnType<typeof appConfig>;
