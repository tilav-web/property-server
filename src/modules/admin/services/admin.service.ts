import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as process from 'process';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminDocument } from '../admin.schema';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UpdateAdminPasswordDto } from '../dto/update-admin-password.dto';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  async create(dto: CreateAdminDto): Promise<Admin> {
    const { email, password, first_name, last_name } = dto;

    const existingAdmin = await this.adminModel.findOne({ email });
    if (existingAdmin) {
      throw new BadRequestException('Admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new this.adminModel({
      email,
      password: hashedPassword,
      first_name,
      last_name,
    });

    return newAdmin.save();
  }

  async findAll(): Promise<Admin[]> {
    return this.adminModel.find().select('-password').exec();
  }

  async findById(id: string): Promise<AdminDocument | null> {
    return this.adminModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.adminModel.findById(id);
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (dto.email && dto.email !== admin.email) {
      const existingAdmin = await this.adminModel.findOne({ email: dto.email });
      if (existingAdmin) {
        throw new BadRequestException('Admin with this email already exists');
      }
      admin.email = dto.email;
    }

    if (dto.password) {
      admin.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.first_name) {
      admin.first_name = dto.first_name;
    }

    if (dto.last_name) {
      admin.last_name = dto.last_name;
    }

    return admin.save();
  }

  async remove(id: string): Promise<{ message: string }> {
    const admin = await this.adminModel.findById(id);
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    const superAdminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (admin.email === superAdminEmail) {
      throw new ForbiddenException('You cannot delete the super admin');
    }

    await this.adminModel.findByIdAndDelete(id);
    return { message: 'Admin deleted successfully' };
  }

  async updatePassword(
    id: string | undefined,
    { old_password, new_password }: UpdateAdminPasswordDto,
  ) {
    if (!id) {
      throw new BadRequestException('Admin ID is required');
    }
    const admin = await this.adminModel.findById(id).select('+password');
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (!old_password || !admin.password) {
      throw new BadRequestException('Old password is required');
    }

    const isMatch = await bcrypt.compare(old_password, admin.password);

    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    admin.password = await bcrypt.hash(new_password, 10);
    await admin.save();
    return { message: 'Password changed successfully' };
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
        email: admin.email,
      },
      { expiresIn: '15m', secret: adminJwtSecret },
    );

    const admin_refresh_token = this.jwtService.sign(
      {
        _id: admin._id,
        role: 'admin',
        email: admin.email,
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

  async createDefaultAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Super';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'Admin';

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
        first_name: adminFirstName,
        last_name: adminLastName,
      });
      console.log('Default admin created successfully.');
    } else {
      console.log('Default admin already exists.');
    }
  }
}

