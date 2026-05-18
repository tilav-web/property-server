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
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { AdminGuard } from '../guards/admin.guard';
import { type IAdminRequestCustom } from '../../../interfaces/admin-request.interface';
import { AdminService } from '../services/admin.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UpdateAdminPasswordDto } from '../dto/update-admin-password.dto';
import {
  AdminAccessTokenResponseDto,
  AdminAuthResponseDto,
  AdminLoginDto,
} from '../dto/admin-auth.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@ApiTags('Admins')
@Controller('admins')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('/login')
  @ApiOperation({
    summary: 'Admin login',
    description:
      "Muvaffaqiyatli login bo'lsa, response body'da `admin_access_token` qaytadi. " +
      "Swagger'da bu tokenni qo'lda olib, yuqori-o'ngdagi **Authorize** tugmasi orqali `bearer` field'iga kiriting " +
      '(yoki sahifaga maxsus skript bu ishni avtomatik bajaradi).',
  })
  @ApiOkResponse({ type: AdminAuthResponseDto })
  @ApiStandardErrors({ validation: true, auth: true })
  async login(@Body() dto: AdminLoginDto, @Res() res: Response) {
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
  @ApiOperation({
    summary: 'Refresh admin access token',
    description:
      "`admin_refresh_token` cookie'sidan foydalanadi. Mobile client'lar uchun body'da yuborilishi qo'llab-quvvatlanmaydi.",
  })
  @ApiCookieAuth('admin_refresh_token')
  @ApiOkResponse({ type: AdminAccessTokenResponseDto })
  @ApiStandardErrors({ auth: true, forbidden: true })
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
  @ApiOperation({
    summary: 'Admin logout (admin_refresh_token cookie tozalanadi)',
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Yangi admin yaratish (faqat super admin)' })
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    validation: true,
    conflict: true,
  })
  create(@Body() dto: CreateAdminDto) {
    return this.service.create(dto);
  }

  @Get('/')
  @UseGuards(AdminGuard, SuperAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Adminlar ro'yxati (faqat super admin)" })
  @ApiStandardErrors({ auth: true, forbidden: true })
  findAll() {
    return this.service.findAll();
  }

  @Patch('/password')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Joriy admin parolini yangilash' })
  @ApiStandardErrors({ auth: true, validation: true })
  updatePassword(
    @Req() req: IAdminRequestCustom,
    @Body() dto: UpdateAdminPasswordDto,
  ) {
    const adminId = req.admin?._id;
    return this.service.updatePassword(adminId, dto);
  }

  @Patch('/:id')
  @UseGuards(AdminGuard, SuperAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Adminni yangilash (faqat super admin)' })
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    validation: true,
  })
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.service.update(id, dto);
  }

  @Delete('/:id')
  @UseGuards(AdminGuard, SuperAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Adminni o'chirish (faqat super admin)" })
  @ApiStandardErrors({ auth: true, forbidden: true, notFound: true })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('/profile')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Joriy admin profili' })
  @ApiStandardErrors({ auth: true })
  getProfile(@Req() req: IAdminRequestCustom) {
    return req.admin;
  }
}
