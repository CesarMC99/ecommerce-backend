import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '../../module/users/domain/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard de autorización por roles (RBAC).
 *
 * Lee la metadata que dejó @Roles() y comprueba que el usuario autenticado
 * (que JwtAuthGuard ya puso en req.user) tenga al menos uno de esos roles.
 * Si el resolver no declara @Roles, se permite el paso: este guard solo
 * restringe cuando se le pide explícitamente.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride: la metadata del método pisa a la de la clase
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext<{
      req: { user?: { roles?: Role[] } };
    }>();
    const user = req.user;

    return !!user && requiredRoles.some((role) => user.roles?.includes(role));
  }
}
