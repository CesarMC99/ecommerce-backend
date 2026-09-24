import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OAuthAccount, User } from '../../domain/entities/user.entity';
import {
  CreateUserData,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { UserMapper } from '../persistence/user.mapper';
import { UserDocument } from '../persistence/user.schema';

/**
 * Implementación Mongoose del UserRepository (adaptador).
 * Se registra en UsersModule bajo el token USER_REPOSITORY.
 */
@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    // El módulo usa la conexión nombrada 'ecommerce-db' (ver app.module.ts)
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel.findById(id).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Se normaliza a minúsculas igual que hace el schema al guardar
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByOAuthAccount(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    // $elemMatch: el MISMO subdocumento debe cumplir ambas condiciones
    const doc = await this.userModel
      .findOne({ oauthAccounts: { $elemMatch: { provider, providerId } } })
      .exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const doc = await this.userModel.create(data);
    return UserMapper.toDomain(doc);
  }

  async addOAuthAccount(userId: string, account: OAuthAccount): Promise<User> {
    const doc = await this.userModel
      .findByIdAndUpdate(
        userId,
        // $addToSet evita duplicar la vinculación si se llama dos veces
        { $addToSet: { oauthAccounts: account } },
        { new: true },
      )
      .exec();

    if (!doc) {
      throw new Error(`Usuario ${userId} no encontrado al vincular OAuth`);
    }
    return UserMapper.toDomain(doc);
  }
}
