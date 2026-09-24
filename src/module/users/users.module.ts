import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/persistence/user.schema';
import { UserRepositoryImpl } from './infrastructure/repositories/user.repository.impl';

/**
 * Módulo de usuarios.
 *
 * Provee la implementación del UserRepository bajo su token y la EXPORTA
 * para que otros módulos (auth) puedan inyectarla sin conocer Mongoose.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
