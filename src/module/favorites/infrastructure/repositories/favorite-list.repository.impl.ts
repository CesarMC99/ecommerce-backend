import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FavoriteList } from '../../domain/entities/favorite-list.entity';
import { FavoriteListRepository } from '../../domain/repositories/favorite-list.repository';
import {
  FavoriteListDoc,
  FavoriteListDocument,
} from '../persistence/favorite-list.schema';

const toDomain = (doc: FavoriteListDoc) =>
  new FavoriteList(
    doc._id.toString(),
    doc.userId.toString(),
    doc.productIds.map((id) => id.toString()),
  );

/** Implementación Mongoose (token FAVORITE_LIST_REPOSITORY). */
@Injectable()
export class FavoriteListRepositoryImpl implements FavoriteListRepository {
  constructor(
    @InjectModel(FavoriteListDocument.name)
    private readonly favoriteListModel: Model<FavoriteListDocument>,
  ) {}

  async findByUserId(userId: string): Promise<FavoriteList | null> {
    const doc = await this.favoriteListModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async save(list: FavoriteList): Promise<FavoriteList> {
    // Upsert atómico por usuario, igual que el carrito
    const doc = await this.favoriteListModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(list.userId) },
        {
          $set: {
            productIds: list.productIds.map((id) => new Types.ObjectId(id)),
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return toDomain(doc);
  }
}
