import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminInquiryService } from '../services/admin-inquiry.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Inquiries')
@ApiStandardErrors({ auth: true })
@Controller('admins/inquiries')
export class AdminInquiryController {
  constructor(private readonly adminInquiryService: AdminInquiryService) {}

  @Get()
  @ApiOperation({ summary: "Barcha so'rovlar ro'yxati (admin)" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.adminInquiryService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      type,
    });
  }
}
