/** Máximo de palabras que se tienen en cuenta en una búsqueda. */
export const MAX_SEARCH_TERMS = 5;

/**
 * "  Abrigo  CAMEL, lana " → ['abrigo', 'camel', 'lana']
 *
 * Normaliza lo que escribe el cliente antes de buscar: minúsculas, sin
 * tildes (el cliente escribe "cafe" y el producto dice "Café"), separado en
 * palabras y sin repetidas. Función pura: se testea sin base de datos.
 */
export function toSearchTerms(text: string): string[] {
  const words = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    // Todo lo que no sea letra o número separa palabras ("t-shirt" → t, shirt)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return [...new Set(words)].slice(0, MAX_SEARCH_TERMS);
}
