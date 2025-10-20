import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { LikeService } from '../services/like.service';

@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post('/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async likeProperty(
    @Param('propertyId') propertyId: string,
    @Req() req: IRequestCustom,
  ) {
    const userId = req.user?._id as string;
    return this.likeService.likeProperty(userId, propertyId);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async findMyLikes(@Req() req: IRequestCustom) {
    const userId = req.user?._id as string;
    return this.likeService.findMyLikes(userId);
  }
}
