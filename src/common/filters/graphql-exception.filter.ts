import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';

/**
 * Filtro global de excepciones para GraphQL.
 *
 * Objetivo: manejo CENTRALIZADO de errores. Los use-cases lanzan excepciones
 * estándar de Nest (UnauthorizedException, ConflictException...) sin saber
 * nada de GraphQL, y este filtro las traduce a GraphQLError con un `code`
 * estable en `extensions` para que el frontend pueda reaccionar
 * programáticamente (ej: si code === 'UNAUTHENTICATED' → intentar refresh).
 *
 * Además evita fugas de información: cualquier error no controlado se
 * responde como INTERNAL_SERVER_ERROR genérico y se registra en el log.
 */
@Catch()
export class GraphqlExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GraphqlExceptionFilter.name);

  // Mapa HTTP status → código de error GraphQL convencional (Apollo)
  private static readonly CODE_BY_STATUS: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_USER_INPUT',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
  };

  catch(exception: unknown) {
    // Si ya es un GraphQLError (ej: error de sintaxis de la query), se respeta
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        GraphqlExceptionFilter.CODE_BY_STATUS[status] ??
        'INTERNAL_SERVER_ERROR';

      // El ValidationPipe empaqueta los mensajes en response.message
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response !== null
          ? String(
              (response as { message?: string | string[] }).message ??
                exception.message,
            )
          : exception.message;

      return new GraphQLError(message, { extensions: { code, status } });
    }

    // Error inesperado: log completo en servidor, mensaje genérico al cliente
    this.logger.error(exception);
    return new GraphQLError('Error interno del servidor', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
