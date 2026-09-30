import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const payload =
      typeof body === 'object' && body !== null
        ? (body as { code?: unknown; message?: unknown })
        : null;
    const codes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'TOO_MANY_REQUESTS',
      502: 'UPSTREAM_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    const message =
      status >= 500
        ? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
        : typeof body === 'string'
          ? body
          : (payload?.message ?? '요청을 처리할 수 없습니다.');
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        code:
          typeof payload?.code === 'string'
            ? payload.code
            : (codes[status] ?? 'INTERNAL_ERROR'),
        message,
      });
  }
}
