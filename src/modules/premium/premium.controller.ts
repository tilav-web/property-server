import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { PremiumService } from './premium.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  Property,
  PropertyDocument,
} from '../property/schemas/property.schema';
import { Model } from 'mongoose';

@ApiTags('Premium')
@Controller('premium')
export class PremiumController {
  constructor(
    private readonly premium: PremiumService,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  /** Voice quota holati (anonim + auth). Voice section UI uchun. */
  @Get('voice/status')
  @ApiOperation({ summary: 'Voice quota holati' })
  async voiceStatus(@Req() req: IRequestCustom) {
    const userId = req.user?._id ? String(req.user._id) : null;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return this.premium.getVoiceQuotaState({ userId, ip });
  }

  /** Property limit holati — faqat auth. */
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @Get('property/status')
  @ApiOperation({ summary: 'Property limit holati (auth)' })
  @ApiStandardErrors({ auth: true })
  async propertyStatus(@Req() req: IRequestCustom) {
    const userId = String(req.user!._id);
    const count = await this.propertyModel
      .countDocuments({ author: req.user!._id })
      .exec();
    return this.premium.getPropertyLimitState(userId, count);
  }

  /** Umumiy premium status — har 2 holatni bitta endpoint'da. */
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @Get('status')
  @ApiOperation({ summary: 'Umumiy premium status' })
  @ApiStandardErrors({ auth: true })
  async status(@Req() req: IRequestCustom) {
    const userId = String(req.user!._id);
    return this.premium.isPremiumActive(userId);
  }

  /** Premium upgrade — Payme checkout URL. */
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @Post('upgrade')
  @ApiOperation({ summary: 'Premium upgrade boshlash (Payme)' })
  @ApiStandardErrors({ auth: true, validation: true })
  async upgrade(@Req() req: IRequestCustom) {
    const userId = String(req.user!._id);
    return this.premium.startUpgrade(userId);
  }

  /** Config — narx, limitlar (admin va frontend uchun ochiq). */
  @Get('config')
  @ApiOperation({ summary: 'Premium config (narx, limitlar)' })
  async getConfig() {
    return this.premium.getConfig();
  }
}
