import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminStatisticService } from '../services/admin-statistic.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Statistics')
@ApiStandardErrors({ auth: true })
@Controller('admins/statistics')
export class AdminStatisticController {
  constructor(private readonly adminStatisticService: AdminStatisticService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard statistikasi' })
  async getDashboardStatistics() {
    return this.adminStatisticService.getDashboardStatistics();
  }
}
