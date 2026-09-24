import { User } from '../../domain/entities/user.entity';
import { UserDoc } from './user.schema';

/**
 * Mapper: documento de Mongoose → entidad de dominio.
 *
 * Único lugar donde se conoce la forma de ambos mundos. Si el schema cambia,
 * solo se toca aquí y el resto de la aplicación sigue funcionando.
 */
export class UserMapper {
  static toDomain(doc: UserDoc): User {
    return new User(
      doc._id.toString(),
      doc.name,
      doc.email,
      doc.passwordHash,
      doc.roles,
      doc.oauthAccounts.map((account) => ({
        provider: account.provider,
        providerId: account.providerId,
      })),
      doc.avatarUrl,
      doc.createdAt,
    );
  }
}
