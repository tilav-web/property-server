import {
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { PropertyPremiumService } from './property-premium.service';

@ApiTags('Property Premium')
@Controller('properties')
export class PropertyPremiumController {
  constructor(
    private readonly premiumService: PropertyPremiumService,
  ) {}

  @Post(':id/upgrade-premium')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: "E'lonni premium qilish uchun to'lov boshlash",
    description:
      "Foydalanuvchi o'z e'lonini premium qilish uchun chaqiradi. Service Transaction yaratadi va Payme checkout URL qaytaradi. " +
      "Foydalanuvchi URL'ga o'tib to'laydi. To'lov muvaffaqiyatli bo'lgach, admin tasdiqlashi kutiladi.",
  })
  @ApiStandardErrors({
    auth: true,
    forbidden: true,
    notFound: true,
    conflict: true,
    validation: true,
    messages: {
      conflict:
        "Bu e'lon uchun allaqachon faol to'lov bor yoki premium yoqilgan",
      forbidden: "Faqat o'z e'loningizni premium qilishingiz mumkin",
    },
  })
  async startUpgrade(
    @Param('id') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    return this.premiumService.startUpgrade({ propertyId, userId });
  }
}
