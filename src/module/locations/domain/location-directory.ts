/**
 * Puerto del "directorio de ubicaciones": qué países y ciudades acepta la
 * tienda. El checkout depende de ESTA interfaz, no del paquete de datos
 * concreto (hoy GeoNames; mañana podría ser una API de mensajería).
 */

export interface ShippingCountry {
  /** ISO 3166-1 alfa-2: 'ES' */
  code: string;
  /** Nombre en español: 'España' */
  name: string;
  /** Prefijo telefónico internacional: '34' */
  dialCode: string;
}

export interface City {
  name: string;
  countryCode: string;
}

export interface LocationDirectory {
  /** Países de envío, ordenados alfabéticamente */
  listCountries(): ShippingCountry[];
  findCountry(code: string): ShippingCountry | null;
  /** Ciudades del país cuyo nombre contiene `search` (sin tildes ni mayúsculas) */
  searchCities(countryCode: string, search: string, limit: number): City[];
  /** La ciudad con ese nombre exacto (ignorando tildes/mayúsculas), o null */
  findCity(countryCode: string, name: string): City | null;
}
