import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PushTokenService } from './push-token.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { RemoveTokenDto } from './dto/remove-token.dto';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import type { IRequestCustom } from '../../interfaces/custom-request.interface';

@Controller('push-tokens')
export class PushTokenController {
  constructor(private readonly pushTokenService: PushTokenService) {}

  /**
   * FCM token'ni ro'yxatdan o'tkazadi.
   * - Anonim (JWT yo'q): token user bilan bog'lanmay saqlanadi
   * - Auth (JWT bor): token user'ga bog'lanadi
   * Login bo'lganda ham qayta chaqirib token'ni user'ga bog'lash kerak.
   */
  @UseGuards(ThrottlerGuard, OptionalJwtGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() dto: RegisterTokenDto,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id;
    await this.pushTokenService.register(dto, userId);
    return { success: true };
  }

  /**
   * Bitta token'ni o'chiradi (ilovadan chiqish yoki ruxsatni bekor qilish).
   * Auth shart emas — token o'zi identifikator.
   */
  @UseGuards(ThrottlerGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(@Body() dto: RemoveTokenDto) {
    await this.pushTokenService.remove(dto.token);
    return { success: true };
  }

  /**
   * Userning BARCHA qurilma token'larini o'chiradi (to'liq logout).
   */
  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async removeAll(@Req() req: IRequestCustom) {
    await this.pushTokenService.removeAllForUser(req.user!._id);
    return { success: true };
  }
}
