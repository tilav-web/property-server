import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatisticService } from './statistic.service';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('statistics')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get('/seller-dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getSellerDashboard(@Req() req: IRequestCustom) {
    const user = req.user;
    if (!user?._id) {
      throw new UnauthorizedException('User not found in request');
    }
    return this.statisticService.getSellerDashboard(user._id);
  }
}
