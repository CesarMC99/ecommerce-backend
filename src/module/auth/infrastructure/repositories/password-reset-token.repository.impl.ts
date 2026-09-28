import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetTokenDocument } from '../persistence/password-reset-token.schema';

/** Implementación Mongoose del PasswordResetTokenRepository. */
@Injectable()
export class PasswordResetTokenRepositoryImpl implements PasswordResetTokenRepository {
  constructor(
    @InjectModel(PasswordResetTokenDocument.name)
    private readonly model: Model<PasswordResetTokenDocument>,
  ) {}

  async replaceForUser(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const owner = new Types.ObjectId(userId);
    // Los enlaces anteriores que aún no se usaron dejan de valer
    await this.model
      .updateMany({ userId: owner, usedAt: null }, { usedAt: new Date() })
      .exec();
    await this.model.create({ userId: owner, tokenHash, expiresAt });
  }

  async findLatestCreatedAt(userId: string): Promise<Date | null> {
    const doc = await this.model
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select({ createdAt: 1 })
      .exec();
    return doc?.createdAt ?? null;
  }

  async consume(tokenHash: string, now: Date): Promise<string | null> {
    // Buscar + marcar en UNA operación: solo gana una petición
    const doc = await this.model
      .findOneAndUpdate(
        { tokenHash, usedAt: null, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
      )
      .exec();
    return doc ? doc.userId.toString() : null;
  }
}
