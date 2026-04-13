import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserDocument } from '../user.schema';
import { UserService } from '../user.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const cookieExtractor = (req: Request): string | null => {
  return (
    (req as Request & { cookies?: Record<string, string> })?.cookies
      ?.access_token ?? null
  );
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET .env faylda topilmadi!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { _id: string }): Promise<UserDocument> {
    if (!payload._id)
      throw new UnauthorizedException(
        'Bu amalni bajarish uchun tizimga kirishingiz kerak!',
      );
    const user = await this.userService.findById(payload._id);
    if (!user)
      throw new UnauthorizedException(
        'Tizimda bu kabi foydalanuvchi topilmadi!',
      );
    return user;
  }
}
