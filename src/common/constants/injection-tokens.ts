/**
 * Tokens de inyección de dependencias.
 *
 * ¿Por qué existen? Las interfaces de TypeScript desaparecen al compilar,
 * así que Nest no puede usarlas como "llave" para inyectar. Estos símbolos
 * son la llave: los use-cases piden `@Inject(USER_REPOSITORY)` y cada módulo
 * decide QUÉ implementación concreta provee (Mongoose hoy, otra mañana).
 * Esto es la "D" de SOLID: la capa de aplicación depende de abstracciones,
 * nunca de Mongoose directamente.
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');
// Lista de providers OAuth registrados (Google hoy; GitHub/Apple mañana)
export const OAUTH_PROVIDERS = Symbol('OAUTH_PROVIDERS');
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const CART_REPOSITORY = Symbol('CART_REPOSITORY');
export const FAVORITE_LIST_REPOSITORY = Symbol('FAVORITE_LIST_REPOSITORY');
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
// Pasarela de pago (Stripe hoy): los use-cases dependen de la interfaz
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
// Países y ciudades de envío (GeoNames hoy)
export const LOCATION_DIRECTORY = Symbol('LOCATION_DIRECTORY');
// Envío de correos (Resend hoy)
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
