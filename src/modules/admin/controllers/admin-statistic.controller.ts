import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminStatisticService } from '../services/admin-statistic.service';

@UseGuards(AdminGuard)
@ApiTags('Admin Statistics')
@Controller('admins/statistics')
export class AdminStatisticController {
  constructor(private readonly adminStatisticService: AdminStatisticService) {}

  @Get('dashboard')
  async getDashboardStatistics() {
    return this.adminStatisticService.getDashboardStatistics();
  }
}
