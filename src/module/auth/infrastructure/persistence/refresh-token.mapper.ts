import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenDoc } from './refresh-token.schema';

/** Documento de Mongoose → entidad de dominio RefreshToken. */
export class RefreshTokenMapper {
  static toDomain(doc: RefreshTokenDoc): RefreshToken {
    return new RefreshToken(
      doc._id.toString(),
      doc.userId.toString(),
      doc.tokenHash,
      doc.expiresAt,
      doc.revokedAt,
      doc.replacedByTokenHash,
      doc.createdAt,
    );
  }
}
