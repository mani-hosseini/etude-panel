import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

type ErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';

    const body = this.mapException(exception, isProduction);

    if (body.error.code === 'INTERNAL_SERVER_ERROR') {
      this.logger.error(
        {
          path: request.url,
          method: request.method,
          err: exception,
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn({
        path: request.url,
        method: request.method,
        code: body.error.code,
        message: body.error.message,
      });
    }

    const status = this.resolveStatus(exception, body.error.code);
    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown, code: string): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    switch (code) {
      case 'VALIDATION_ERROR':
        return HttpStatus.BAD_REQUEST;
      case 'UNAUTHORIZED':
        return HttpStatus.UNAUTHORIZED;
      case 'FORBIDDEN':
        return HttpStatus.FORBIDDEN;
      case 'NOT_FOUND':
        return HttpStatus.NOT_FOUND;
      case 'CONFLICT':
        return HttpStatus.CONFLICT;
      case 'TOO_MANY_REQUESTS':
        return HttpStatus.TOO_MANY_REQUESTS;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private mapException(exception: unknown, isProduction: boolean): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            exception.message);

      const normalizedMessage = Array.isArray(message)
        ? message.join(', ')
        : message;

      return {
        success: false,
        error: {
          code: this.codeFromStatus(status),
          message: normalizedMessage,
          details:
            typeof payload === 'object' &&
            payload !== null &&
            'message' in payload &&
            Array.isArray((payload as { message: unknown }).message)
              ? (payload as { message: string[] }).message
              : undefined,
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'این مورد از قبل ثبت شده است.',
            details: isProduction ? undefined : exception.meta,
          },
        };
      }
      if (exception.code === 'P2025') {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'مورد نظر یافت نشد.',
          },
        };
      }
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'الان امکان انجام این کار نیست. کمی بعد دوباره تلاش کنید.',
      },
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      default:
        return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST';
    }
  }
}
