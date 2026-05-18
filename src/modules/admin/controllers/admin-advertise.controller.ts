import {
  Controller,
  Get,
  Query,
  UseGuards,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminAdvertiseService } from '../services/admin-advertise.service';
import { FindAdvertisesDto } from '../dto/find-advertises.dto';
import { UpdateAdvertiseStatusDto } from '../dto/update-advertise-status.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Advertises')
@ApiStandardErrors({ auth: true })
@Controller('admins/advertises')
export class AdminAdvertiseController {
  constructor(private readonly adminAdvertiseService: AdminAdvertiseService) {}

  @Get()
  @ApiOperation({ summary: 'Reklamalar ro‘yxati (admin)' })
  async findAll(@Query() dto: FindAdvertisesDto) {
    return this.adminAdvertiseService.findAll(dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Reklama statusini o‘zgartirish' })
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateAdvertiseStatusDto: UpdateAdvertiseStatusDto,
  ) {
    return this.adminAdvertiseService.updateStatus(
      id,
      updateAdvertiseStatusDto,
    );
  }
}
