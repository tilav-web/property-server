import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { LikeService } from '../services/like.service';
import { SkipThrottle } from '@nestjs/throttler';
import { EnumLanguage } from 'src/enums/language.enum';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

// Like/unlike arzon, idempotent, foydalanuvchi bevosita bosadigan amal —
// throttler bu yerda UX'ga zarar keltiradi (tez-tez bosish oddiy holat).
// Yuklama himoyasi navbat (queue) darajasida hal qilinadi, so'rovni
// bloklash orqali emas.
@SkipThrottle()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearer')
@ApiCookieAuth('access_token')
@ApiTags('Likes')
@ApiStandardErrors({ auth: true })
@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post('/:propertyId')
  @ApiOperation({ summary: 'E’lonni like / unlike qilish' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async likeProperty(
    @Param('propertyId') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    const language = req.headers['accept-language'] as EnumLanguage;
    return this.likeService.likeProperty({ userId, propertyId, language });
  }

  @Get('/')
  @ApiOperation({ summary: 'Mening like’larim' })
  async findMyLikes(@Req() req: IRequestCustom) {
    const userId = req.user?._id as string;
    return this.likeService.findMyLikes(userId);
  }
}
