import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * @CurrentUser(): azúcar sintáctico para leer el usuario autenticado.
 *
 * El JwtAuthGuard (vía passport-jwt) valida el token y deja el resultado de
 * JwtStrategy.validate() en `req.user`. Este decorador lo extrae del contexto
 * GraphQL para que los resolvers no tengan que conocer ese detalle.
 *
 * Uso:  me(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    // Se tipa el contexto para no propagar `any` (regla no-unsafe-*)
    const { req } = ctx.getContext<{ req: { user?: unknown } }>();
    return req.user;
  },
);
