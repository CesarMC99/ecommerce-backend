import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/**
 * Valida un teléfono SEGÚN su país y lo devuelve en formato internacional
 * E.164 ("612 345 678" + ES → "+34612345678"), o null si no es válido.
 *
 * Cada país tiene sus reglas (longitud, prefijos de móvil...): en vez de
 * escribir 80 expresiones regulares se usa libphonenumber, la librería de
 * Google que usan Android y WhatsApp. Guardar en E.164 hace que el número
 * funcione tal cual para el transportista, esté donde esté.
 */
export function normalizePhone(
  phone: string,
  countryCode: string,
): string | null {
  const parsed = parsePhoneNumberFromString(phone, countryCode as CountryCode);
  if (!parsed?.isValid()) return null;
  // El número debe ser DEL país elegido (no un +52 con país España)
  if (parsed.country && parsed.country !== countryCode) return null;
  return parsed.number;
}
