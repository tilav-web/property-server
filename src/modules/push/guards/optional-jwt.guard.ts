import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** JWT token bo'lsa user'ni req.user'ga yozadi, bo'lmasa xato bermaydi. */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
  ): TUser | null {
    return user || null;
  }
}
