import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StatisticService } from './statistic.service';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get('/dashboard')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'User dashboard statistikasi' })
  @ApiStandardErrors({ auth: true })
  async getDashboard(@Req() req: IRequestCustom) {
    const user = req.user;
    if (!user?._id) {
      throw new UnauthorizedException('User not found in request');
    }
    return this.statisticService.getSellerDashboard(user._id);
  }
}
