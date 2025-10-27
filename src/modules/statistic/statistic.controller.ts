import { Controller, Get, Req } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('statistics')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get('seller')
  async getSellerStatistics(@Req() req: IRequestCustom) {
    const user = req.user;
    return this.statisticService.getSellerPropertyStatistics(
      user?._id as string,
    );
  }
}
