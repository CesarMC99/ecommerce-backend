import { SetMetadata } from '@nestjs/common';
import { Role } from '../../module/users/domain/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * @Roles('admin'): marca un resolver con los roles que pueden ejecutarlo.
 *
 * Solo adjunta metadata; quien la lee y decide es el RolesGuard.
 * Se usa SIEMPRE junto a JwtAuthGuard (primero autenticar, luego autorizar):
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
