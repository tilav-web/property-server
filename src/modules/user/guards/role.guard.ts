import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IRequestCustom } from 'src/interfaces/custom-request.interface';

@Injectable()
export class AuthRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest<IRequestCustom>();
    const user = req.user;

    if (!user || !user.role) {
      throw new ForbiddenException("Foydalanuvchi ma'lumotlari topilmadi");
    }

    return requiredRoles.some((role) => user.role.includes(role));
  }
}
