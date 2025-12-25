import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../services/admin.service';
import { AdminDocument } from '../admin.schema';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {
    const adminJwtSecret = configService.get<string>('ADMIN_JWT_SECRET');

    if (!adminJwtSecret) {
      throw new Error('ADMIN_JWT_SECRET environment variable not found!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: adminJwtSecret,
    });
  }

  async validate(payload: {
    _id: string;
    role: string;
  }): Promise<AdminDocument> {
    if (!payload._id)
      throw new UnauthorizedException(
        'Admin: Invalid token payload. Missing _id.',
      );
    const admin = await this.adminService.findById(payload._id);
    if (!admin)
      throw new UnauthorizedException('Admin: No admin found for this token.');
    return admin;
  }
}
