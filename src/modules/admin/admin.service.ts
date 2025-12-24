import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './admin.schema';
import * as bcrypt from 'bcrypt';
import * as process from 'process';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<AdminDocument | null> {
    return this.adminModel.findById(id).exec();
  }

  async login({ email, password }: { email: string; password: string }) {
    if (!email) throw new BadRequestException('Admin: Email is required!');

    const admin = await this.adminModel.findOne({ email }).select('+password');
    if (!admin)
      throw new BadRequestException('Admin: Admin with this email not found.');

    if (!password || !admin.password)
      throw new BadRequestException('Admin: Password is required!');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new BadRequestException('Admin: Invalid credentials.');

    const adminJwtSecret = this.configService.get<string>('ADMIN_JWT_SECRET');

    const admin_access_token = this.jwtService.sign(
      {
        _id: admin._id,
        role: 'admin', // Assuming a fixed role for admin
      },
      { expiresIn: '15m', secret: adminJwtSecret },
    );

    const admin_refresh_token = this.jwtService.sign(
      {
        _id: admin._id,
        role: 'admin',
      },
      { expiresIn: '7d', secret: adminJwtSecret },
    );

    const { password: _, ...adminWithoutPassword } = admin.toObject();
    void _;

    return {
      admin: adminWithoutPassword,
      admin_access_token,
      admin_refresh_token,
    };
  }

  async refresh(admin_refresh_token: string) {
    const adminJwtSecret = this.configService.get<string>('ADMIN_JWT_SECRET');

    try {
      const payload = await this.jwtService.verifyAsync<{
        _id: string;
        role: string;
      }>(admin_refresh_token, { secret: adminJwtSecret });

      const admin_access_token = this.jwtService.sign(
        {
          _id: payload._id,
          role: payload.role,
        },
        { expiresIn: '15m', secret: adminJwtSecret },
      );
      return admin_access_token;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Admin: Invalid refresh token.');
    }
  }

  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  async createDefaultAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn(
        'Default admin credentials are not provided in environment variables. Skipping default admin creation.',
      );
      return;
    }

    const existingAdmin = await this.adminModel
      .findOne({ email: adminEmail })
      .exec();

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await this.adminModel.create({
        email: adminEmail,
        password: hashedPassword,
      });
      console.log('Default admin created successfully.');
    } else {
      console.log('Default admin already exists.');
    }
  }
}
