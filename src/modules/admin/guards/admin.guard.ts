import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class AdminGuard extends AuthGuard('admin-jwt') {
  handleRequest<TAdmin = unknown>(
    err: unknown,
    user: TAdmin | false,
    info: unknown,
    context: ExecutionContext,
  ): TAdmin {
    if (user) {
      const req = context
        .switchToHttp()
        .getRequest<Request & { admin?: TAdmin }>();
      req.admin = user;
      return user;
    }

    if (err instanceof TokenExpiredError || info instanceof TokenExpiredError) {
      throw new UnauthorizedException({
        message: 'Admin sessiyasi muddati tugagan. Iltimos qayta kiring.',
        code: 'token_expired',
      });
    }
    if (err instanceof JsonWebTokenError || info instanceof JsonWebTokenError) {
      throw new UnauthorizedException({
        message: "Admin token noto'g'ri yoki buzilgan.",
        code: 'token_invalid',
      });
    }

    const req = context.switchToHttp().getRequest<Request>();
    if (!req.headers.authorization) {
      throw new UnauthorizedException({
        message:
          'Admin endpointlari Authorization: Bearer <admin_access_token> headerini talab qiladi.',
        code: 'token_missing',
      });
    }

    if (err) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }

    throw new UnauthorizedException({
      message: 'Admin topilmadi yoki token yaroqsiz.',
      code: 'admin_not_found',
    });
  }
}
