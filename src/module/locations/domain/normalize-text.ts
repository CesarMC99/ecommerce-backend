/** "Málaga" → "malaga": buscar "malaga" o "MÁLAGA" encuentra lo mismo. */
export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
