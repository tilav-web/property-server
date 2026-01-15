import {
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Post,
  Res,
  Req,
  UseGuards,
  Get,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { type Response } from 'express';
import { AdminGuard } from '../guards/admin.guard';
import { type IAdminRequestCustom } from '../../../interfaces/admin-request.interface';
import { AdminService } from '../services/admin.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UpdateAdminPasswordDto } from '../dto/update-admin-password.dto';

@Controller('admins')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('/login')
  async login(
    @Body() dto: { email: string; password: string },
    @Res() res: Response,
  ) {
    try {
      const { admin, admin_refresh_token, admin_access_token } =
        await this.service.login(dto);

      return res
        .cookie('admin_refresh_token', admin_refresh_token, {
          httpOnly: process.env.NODE_ENV === 'production',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        })
        .json({ admin, admin_access_token });
    } catch (error) {
      console.error(error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Tizimda xatolik ketdi. Iltimos birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/refresh-token')
  async refresh(
    @Req()
    req: IAdminRequestCustom & { cookies: { admin_refresh_token?: string } },
  ) {
    try {
      const admin_refresh_token = req.cookies['admin_refresh_token'];
      if (!admin_refresh_token) {
        throw new HttpException('No refresh token provided', 403);
      }
      const new_admin_access_token =
        await this.service.refresh(admin_refresh_token);
      return new_admin_access_token;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        "Xatolik ketdi. Birozdan so'ng qayta urinib ko'ring!",
      );
    }
  }

  @Post('/logout')
  logout(@Res() res: Response) {
    return res
      .clearCookie('admin_refresh_token', {
        httpOnly: process.env.NODE_ENV === 'production',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })
      .json({ message: 'Logout successful' });
  }

  @Post('/')
  @UseGuards(AdminGuard, SuperAdminGuard)
  create(@Body() dto: CreateAdminDto) {
    return this.service.create(dto);
  }

  @Get('/')
  @UseGuards(AdminGuard, SuperAdminGuard)
  findAll() {
    return this.service.findAll();
  }

  @Patch('/password')
  @UseGuards(AdminGuard)
  updatePassword(
    @Req() req: IAdminRequestCustom,
    @Body() dto: UpdateAdminPasswordDto,
  ) {
    const adminId = req.admin?._id;
    return this.service.updatePassword(adminId, dto);
  }

  @Patch('/:id')
  @UseGuards(AdminGuard, SuperAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.service.update(id, dto);
  }

  @Delete('/:id')
  @UseGuards(AdminGuard, SuperAdminGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('/profile')
  @UseGuards(AdminGuard)
  getProfile(@Req() req: IAdminRequestCustom) {
    return req.admin;
  }
}
