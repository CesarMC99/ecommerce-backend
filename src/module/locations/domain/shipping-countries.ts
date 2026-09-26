/**
 * Países a los que envía la tienda: toda América y Europa (códigos ISO
 * 3166-1 alfa-2). Añadir o quitar un país es tocar SOLO esta lista: el
 * combobox del checkout, la validación del backend y el prefijo telefónico
 * salen de aquí.
 *
 * Fuera de la lista a propósito: Rusia y Bielorrusia (sanciones de la UE
 * sobre exportaciones), y territorios sin datos fiables de ciudades.
 */
export const AMERICA_COUNTRY_CODES = [
  // Norteamérica
  'CA',
  'US',
  'MX',
  // Centroamérica
  'BZ',
  'CR',
  'SV',
  'GT',
  'HN',
  'NI',
  'PA',
  // Caribe
  'AG',
  'BS',
  'BB',
  'CU',
  'DM',
  'DO',
  'GD',
  'HT',
  'JM',
  'KN',
  'LC',
  'VC',
  'TT',
  'PR',
  // Sudamérica
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'EC',
  'GY',
  'PY',
  'PE',
  'SR',
  'UY',
  'VE',
] as const;

export const EUROPE_COUNTRY_CODES = [
  'AL',
  'AD',
  'AT',
  'BE',
  'BA',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IS',
  'IE',
  'IT',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'MD',
  'MC',
  'ME',
  'NL',
  'MK',
  'NO',
  'PL',
  'PT',
  'RO',
  'SM',
  'RS',
  'SK',
  'SI',
  'ES',
  'SE',
  'CH',
  'UA',
  'GB',
  'VA',
] as const;

export const SHIPPING_COUNTRY_CODES: readonly string[] = [
  ...AMERICA_COUNTRY_CODES,
  ...EUROPE_COUNTRY_CODES,
];
