import { randomInt } from 'crypto';

// Sin 0/O ni 1/I/L: al dictar el número por teléfono no hay confusiones
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 8;

/**
 * Número de pedido legible: "AMB-7K3F9Q2M".
 *
 * El id de Mongo (66f1c2...) es feo para un cliente. Este se puede leer,
 * dictar y buscar. Con 31^8 ≈ 850.000 millones de combinaciones, una
 * repetición es prácticamente imposible, y el índice único de la base de
 * datos lo impediría de todos modos.
 *
 * randomInt de `crypto` (y no Math.random): aleatoriedad criptográfica, así
 * nadie puede adivinar el número del pedido siguiente
 */
export function generateOrderNumber(): string {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `AMB-${code}`;
}
