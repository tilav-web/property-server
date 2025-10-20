import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { LikeService } from '../services/like.service';
import { Throttle } from '@nestjs/throttler';

@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Throttle({ default: { limit: 10, ttl: 10000 } })
  @Post('/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async likeProperty(
    @Param('propertyId') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    return this.likeService.likeProperty(userId, propertyId);
  }

  @Throttle({ default: { limit: 15, ttl: 10000 } })
  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async findMyLikes(@Req() req: IRequestCustom) {
    const userId = req.user?._id as string;
    return this.likeService.findMyLikes(userId);
  }
}
