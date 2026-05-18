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
import { Throttle } from '@nestjs/throttler';
import { EnumLanguage } from 'src/enums/language.enum';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearer')
@ApiCookieAuth('access_token')
@ApiTags('Likes')
@ApiStandardErrors({ auth: true, throttle: true })
@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Throttle({ default: { limit: 10, ttl: 10000 } })
  @Post('/:propertyId')
  @ApiOperation({ summary: 'E’lonni like / unlike qilish' })
  @ApiStandardErrors({ auth: true, notFound: true, throttle: true })
  async likeProperty(
    @Param('propertyId') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    const language = req.headers['accept-language'] as EnumLanguage;
    return this.likeService.likeProperty({ userId, propertyId, language });
  }

  @Throttle({ default: { limit: 15, ttl: 10000 } })
  @Get('/')
  @ApiOperation({ summary: 'Mening like’larim' })
  async findMyLikes(@Req() req: IRequestCustom) {
    const userId = req.user?._id as string;
    return this.likeService.findMyLikes(userId);
  }
}
