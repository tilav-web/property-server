import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { VoicePremiumService } from './voice-premium.service';

@ApiTags('Voice Premium')
@Controller('voice-premium')
export class VoicePremiumController {
  constructor(private readonly service: VoicePremiumService) {}

  /** Voice quota holatini qaytaradi — UI'da ko'rsatish uchun. */
  @Get('status')
  @ApiOperation({ summary: 'Voice quota holati (anonim ham, auth ham)' })
  async status(@Req() req: IRequestCustom) {
    const userId = req.user?._id ? String(req.user._id) : null;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return this.service.getQuotaState({ userId, ip });
  }

  /** Premium upgrade boshlash — Payme checkout URL qaytaradi. */
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @Post('upgrade')
  @ApiOperation({ summary: 'Voice premium upgrade boshlash (Payme)' })
  @ApiStandardErrors({ auth: true, validation: true, serverError: true })
  async upgrade(@Req() req: IRequestCustom) {
    const userId = String(req.user!._id);
    return this.service.startUpgrade(userId);
  }
}
