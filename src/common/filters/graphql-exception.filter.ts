import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
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
    // Un servicio externo no configurado o caído (p. ej. Stripe sin clave)
    [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  };

  catch(exception: unknown, host: ArgumentsHost) {
    // Peticiones REST (p. ej. el webhook de Stripe): en HTTP no basta con
    // DEVOLVER el error como en GraphQL, hay que ESCRIBIR la respuesta; si
    // no, la petición se quedaría colgada sin contestar
    if (host.getType() === 'http') {
      return this.replyHttp(exception, host.switchToHttp().getResponse());
    }

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
      const raw =
        typeof response === 'object' && response !== null
          ? ((response as { message?: string | string[] }).message ??
            exception.message)
          : exception.message;
      // En inputs anidados el ValidationPipe antepone la ruta del campo
      // ("shippingAddress.El teléfono..."): se quita, el mensaje es para humanos
      const message = Array.isArray(raw)
        ? raw.map((text) => text.replace(/^(\w+\.)+/, '')).join(',')
        : raw;

      return new GraphQLError(message, { extensions: { code, status } });
    }

    // Error inesperado: log completo en servidor, mensaje genérico al cliente
    this.logger.error(exception);
    return new GraphQLError('Error interno del servidor', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  /** Respuesta JSON para REST, con las mismas reglas: nada interno se filtra. */
  private replyHttp(exception: unknown, res: Response): void {
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    this.logger.error(exception);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Error interno del servidor' });
  }
}
