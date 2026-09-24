import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  CreateRefreshTokenData,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { RefreshTokenMapper } from '../persistence/refresh-token.mapper';
import { RefreshTokenDocument } from '../persistence/refresh-token.schema';

/** Implementación Mongoose del RefreshTokenRepository. */
@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshTokenDocument.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await this.refreshTokenModel.findOne({ tokenHash }).exec();
    return doc ? RefreshTokenMapper.toDomain(doc) : null;
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const doc = await this.refreshTokenModel.create(data);
    return RefreshTokenMapper.toDomain(doc);
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<void> {
    await this.refreshTokenModel
      .updateOne(
        { _id: id },
        {
          revokedAt: new Date(),
          ...(replacedByTokenHash ? { replacedByTokenHash } : {}),
        },
      )
      .exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    // Solo toca los tokens aún vivos: los ya revocados conservan su fecha
    await this.refreshTokenModel
      .updateMany({ userId, revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }
}
