import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private normalize(exception: unknown): HttpException {
    if (exception instanceof HttpException) return exception;

    // Mongoose validation xatolari — 400
    if (exception instanceof MongooseError.ValidationError) {
      const fields = Object.entries(exception.errors).map(([path, err]) => ({
        field: path,
        message: (err as { message: string }).message,
      }));
      return new BadRequestException({
        message: 'Validatsiya xatoligi',
        errors: fields,
      });
    }

    // Mongoose Cast error (noto'g'ri ObjectId va h.k.) — 400
    if (exception instanceof MongooseError.CastError) {
      return new BadRequestException({
        message: `Noto‘g‘ri qiymat: ${exception.path}`,
        errors: [{ field: exception.path, value: exception.value }],
      });
    }

    // Mongo duplicate key — 409
    if (isMongoServerError(exception) && exception.code === 11000) {
      const fields = Object.keys(exception.keyValue ?? {});
      return new ConflictException({
        message: 'Bunday qiymat allaqachon mavjud',
        errors: fields.map((f) => ({ field: f })),
      });
    }

    // File not found / ENOENT va shunga o'xshash system xatolar — 404 emas, 500
    // (default ga tushiriladi)

    // Standart Error instance — foydali message'ni chiqaramiz, lekin 500 emas
    // agar bu aniq biznes xatolik bo'lsa (masalan Service ichida `throw new Error`)
    // biznes mantiqida emas, dev xatolik bo'ladi — 500 qaytarishni davom ettiramiz
    if (exception instanceof Error) {
      // Agar message "not found" matnini o'z ichiga olsa — 404
      const lower = exception.message.toLowerCase();
      if (lower.includes('not found') || lower.includes('topilmadi')) {
        return new NotFoundException(exception.message);
      }
    }

    return new HttpException(
      {
        message: 'Ichki server xatoligi',
        error:
          exception instanceof Error ? exception.message : String(exception),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpException = this.normalize(exception);
    const status = httpException.getStatus();
    const body = httpException.getResponse();

    // Server-side xatoliklarini log qilamiz, 4xx'larni — faqat qisqa
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `HTTP ${status} ${request.method} ${request.url} — ${
          typeof body === 'string'
            ? body
            : (body as { message?: string }).message || ''
        }`,
      );
    }

    response.status(status).json(body);
  }
}
