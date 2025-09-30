import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserDocument } from '../user.schema';
import { UserService } from '../user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
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
