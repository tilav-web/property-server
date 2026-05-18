import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * User uchun JWT guard. Standart `AuthGuard('jwt')`'dan farqi —
 * passport'dan kelgan `info` obyektidan SABAB chiqarib aniq
 * UnauthorizedException tashlaydi. Global filter sabab kodini (token_missing,
 * token_expired, token_invalid, user_not_found) javobga qo'shadi.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (user) return user;

    if (err instanceof TokenExpiredError || info instanceof TokenExpiredError) {
      throw new UnauthorizedException({
        message: 'Sessiya muddati tugagan. Iltimos qayta tizimga kiring.',
        code: 'token_expired',
      });
    }
    if (err instanceof JsonWebTokenError || info instanceof JsonWebTokenError) {
      throw new UnauthorizedException({
        message: "Token noto'g'ri yoki buzilgan. Qayta tizimga kiring.",
        code: 'token_invalid',
      });
    }

    const req = context.switchToHttp().getRequest<Request>();
    const hasAuthHeader = !!req.headers.authorization;
    const hasAccessCookie = !!(
      req as Request & {
        cookies?: Record<string, string>;
      }
    ).cookies?.access_token;
    const hasRefreshCookie = !!(
      req as Request & {
        cookies?: Record<string, string>;
      }
    ).cookies?.refresh_token;

    if (!hasAuthHeader && !hasAccessCookie) {
      throw new UnauthorizedException({
        message: hasRefreshCookie
          ? 'Access token topilmadi. Avval /users/auth/refresh-token orqali yangilang.'
          : 'Bu amalni bajarish uchun tizimga kirishingiz kerak (Authorization: Bearer <token> yoki access_token cookie).',
        code: 'token_missing',
      });
    }

    if (err) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }

    throw new UnauthorizedException({
      message: 'Token egasi tizimda topilmadi yoki yaroqsiz.',
      code: 'user_not_found',
    });
  }
}
