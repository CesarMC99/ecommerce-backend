import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación por JWT para GraphQL.
 *
 * AuthGuard('jwt') de passport asume una petición HTTP/REST y busca la
 * request en `context.switchToHttp()`. En GraphQL la request viaja dentro
 * del contexto de Apollo, así que el ÚNICO cambio necesario es enseñarle
 * dónde encontrarla (por eso pusimos `context: ({ req, res })` en AppModule).
 *
 * El resto (extraer el Bearer, verificar firma/expiración, poblar req.user)
 * lo hace la JwtStrategy registrada en el AuthModule.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: Express.Request }>().req;
  }
}
