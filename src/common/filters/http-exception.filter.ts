import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

interface MongoServerError {
  name: 'MongoServerError';
  code: number;
  keyValue?: Record<string, unknown>;
  message: string;
}

function isMongoServerError(err: unknown): err is MongoServerError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'MongoServerError'
  );
}

interface NormalizedBody {
  statusCode: number;
  message: string;
  code?: string;
  errors?: unknown;
  [key: string]: unknown;
}

/**
 * UnauthorizedException sabablarini aniqlashtirishga harakat qiladi.
 * Passport / JWT'dan kelgan info object yoki xabar matnidan SABAB chiqaradi.
 */
function classifyUnauthorized(
  exception: unknown,
  request: Request,
): { message: string; code: string } {
  const hasAuthHeader = !!request.headers.authorization;
  const hasAccessCookie = !!(
    request as Request & { cookies?: Record<string, string> }
  ).cookies?.access_token;
  const hasRefreshCookie = !!(
    request as Request & { cookies?: Record<string, string> }
  ).cookies?.refresh_token;

  const rawMessage =
    exception instanceof Error ? exception.message.toLowerCase() : '';

  if (
    exception instanceof TokenExpiredError ||
    rawMessage.includes('jwt expired')
  ) {
    return {
      message: 'Sessiya muddati tugagan. Iltimos qayta tizimga kiring.',
      code: 'token_expired',
    };
  }
  if (
    exception instanceof JsonWebTokenError ||
    rawMessage.includes('invalid token') ||
    rawMessage.includes('jwt malformed') ||
    rawMessage.includes('invalid signature')
  ) {
    return {
      message: "Token noto'g'ri yoki buzilgan. Qayta tizimga kiring.",
      code: 'token_invalid',
    };
  }
  if (
    rawMessage.includes('no auth token') ||
    (!hasAuthHeader && !hasAccessCookie)
  ) {
    return {
      message: hasRefreshCookie
        ? 'Access token topilmadi. Avval /auth/refresh-token orqali yangilang.'
        : 'Bu amalni bajarish uchun tizimga kirishingiz kerak (Authorization: Bearer <token> yoki access_token cookie).',
      code: 'token_missing',
    };
  }
  if (
    rawMessage.includes('user not found') ||
    rawMessage.includes('topilmadi')
  ) {
    return {
      message: 'Token egasi tizimda topilmadi. Qayta tizimga kiring.',
      code: 'user_not_found',
    };
  }

  return {
    message:
      exception instanceof Error && exception.message
        ? exception.message
        : 'Avtorizatsiya talab qilinadi',
    code: 'unauthorized',
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private normalize(
    exception: unknown,
    request: Request,
  ): { status: number; body: NormalizedBody } {
    // 1) Allaqachon HttpException — body'ni boyitamiz
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const base: NormalizedBody = {
        statusCode: status,
        message: '',
      };

      if (typeof raw === 'string') {
        base.message = raw;
      } else if (raw && typeof raw === 'object') {
        Object.assign(base, raw as Record<string, unknown>);
        const r = raw as { message?: string | string[] };
        if (Array.isArray(r.message)) {
          base.message = r.message[0] ?? '';
        } else if (typeof r.message === 'string') {
          base.message = r.message;
        }
      }

      // Standart NestJS exception'lar uchun aniqroq xabar / code qo'shamiz
      if (exception instanceof UnauthorizedException) {
        if (!base.message || base.message === 'Unauthorized') {
          const { message, code } = classifyUnauthorized(exception, request);
          base.message = message;
          base.code ??= code;
        } else {
          base.code ??= 'unauthorized';
        }
      } else if (exception instanceof ForbiddenException) {
        if (!base.message || base.message === 'Forbidden') {
          base.message = "Bu amalni bajarishga ruxsat yo'q";
        }
        base.code ??= 'forbidden';
      } else if (exception instanceof NotFoundException) {
        if (!base.message || base.message === 'Not Found') {
          base.message = `Resurs topilmadi: ${request.method} ${request.url}`;
        }
        base.code ??= 'not_found';
      } else if (exception instanceof BadRequestException) {
        base.code ??= 'bad_request';
      } else if (exception instanceof ConflictException) {
        base.code ??= 'conflict';
      }

      base.statusCode = status;
      return { status, body: base };
    }

    // 2) Passport / JWT'dan kelgan to'g'ridan-to'g'ri xatolar
    if (
      exception instanceof TokenExpiredError ||
      exception instanceof JsonWebTokenError
    ) {
      const { message, code } = classifyUnauthorized(exception, request);
      return {
        status: HttpStatus.UNAUTHORIZED,
        body: { statusCode: HttpStatus.UNAUTHORIZED, message, code },
      };
    }

    // 3) Mongoose validation xatolari — 400
    if (exception instanceof MongooseError.ValidationError) {
      const fields = Object.entries(exception.errors).map(([path, err]) => ({
        field: path,
        message: (err as { message: string }).message,
      }));
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validatsiya xatoligi',
          code: 'validation_error',
          errors: fields,
        },
      };
    }

    // 4) Mongoose Cast error (noto'g'ri ObjectId va h.k.) — 400
    if (exception instanceof MongooseError.CastError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Noto'g'ri qiymat: ${exception.path} = ${String(exception.value)}`,
          code: 'invalid_value',
          errors: [{ field: exception.path, value: String(exception.value) }],
        },
      };
    }

    // 5) Mongo duplicate key — 409
    if (isMongoServerError(exception) && exception.code === 11000) {
      const fields = Object.keys(exception.keyValue ?? {});
      return {
        status: HttpStatus.CONFLICT,
        body: {
          statusCode: HttpStatus.CONFLICT,
          message: `Bunday qiymat allaqachon mavjud${fields.length ? `: ${fields.join(', ')}` : ''}`,
          code: 'duplicate_key',
          errors: fields.map((f) => ({
            field: f,
            value: exception.keyValue?.[f],
          })),
        },
      };
    }

    // 6) Boshqa Error — "not found" matn bo'lsa 404, aks holda 500
    if (exception instanceof Error) {
      const lower = exception.message.toLowerCase();
      if (lower.includes('not found') || lower.includes('topilmadi')) {
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            statusCode: HttpStatus.NOT_FOUND,
            message: exception.message,
            code: 'not_found',
          },
        };
      }
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ichki server xatoligi',
          code: 'internal_error',
          error: exception.message,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ichki server xatoligi',
        code: 'internal_error',
        error: String(exception),
      },
    };
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception, request);

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} ${request.method} ${request.url}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `HTTP ${status} ${request.method} ${request.url} — ${body.message}${
          body.code ? ` [${body.code}]` : ''
        }`,
      );
    }

    response.status(status).json(body);
  }
}
