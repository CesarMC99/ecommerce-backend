import { accentInsensitivePattern } from '../../infrastructure/repositories/product.repository.impl';
import { MAX_SEARCH_TERMS, toSearchTerms } from './search-terms';

describe('Búsqueda de productos', () => {
  describe('toSearchTerms', () => {
    it('normaliza: minúsculas, sin tildes, palabras sueltas y sin repetir', () => {
      expect(toSearchTerms('  Abrigo  CAMEL, abrigo  Café ')).toEqual([
        'abrigo',
        'camel',
        'cafe',
      ]);
    });

    it('ignora símbolos: una búsqueda solo de símbolos queda vacía', () => {
      expect(toSearchTerms('!!! ¿? ...')).toEqual([]);
    });

    it(`como mucho ${MAX_SEARCH_TERMS} palabras`, () => {
      expect(toSearchTerms('a b c d e f g h')).toHaveLength(MAX_SEARCH_TERMS);
    });
  });

  describe('accentInsensitivePattern', () => {
    const matches = (term: string, text: string) =>
      new RegExp(accentInsensitivePattern(term), 'i').test(text);

    it('encuentra la palabra con o sin tildes y a medio escribir', () => {
      expect(matches('cafe', 'Café')).toBe(true);
      expect(matches('algodon', '100% algodón')).toBe(true);
      expect(matches('abri', 'Abrigo de lana')).toBe(true);
      expect(matches('camisa', 'Abrigo de lana')).toBe(false);
    });

    it('solo al principio de una palabra (sin ruido de mitad de palabra)', () => {
      expect(matches('abri', 'Fabricado en Portugal')).toBe(false);
      expect(matches('lana', 'Abrigo de lana')).toBe(true);
      expect(matches('lana', '80% lana, 20% poliamida')).toBe(true);
    });

    it('los símbolos de regex se tratan como texto (no se pueden inyectar)', () => {
      // ".*" como regex lo encontraría TODO; escapado, solo el texto ".*"
      expect(matches('.*', 'Abrigo de lana')).toBe(false);
      expect(matches('.*', 'precio .* raro')).toBe(true);
    });
  });
});
