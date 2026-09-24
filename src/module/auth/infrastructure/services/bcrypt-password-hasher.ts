import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../../domain/services/password-hasher.interface';

/**
 * Adaptador bcrypt del puerto PasswordHasher.
 *
 * ¿Por qué bcrypt y no SHA-256? Porque bcrypt es deliberadamente LENTO y
 * incluye un salt aleatorio por hash: hace inviable el ataque por fuerza
 * bruta / rainbow tables si roban la BD. SHA-256 (que sí usamos para los
 * refresh tokens) es rápido, y eso es aceptable allí porque esos tokens
 * tienen 64 bytes de entropía aleatoria — una contraseña humana no.
 */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  // 12 rondas ≈ 250ms por hash: equilibrio entre seguridad y latencia de login
  private static readonly SALT_ROUNDS = 12;

  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, BcryptPasswordHasher.SALT_ROUNDS);
  }

  compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
