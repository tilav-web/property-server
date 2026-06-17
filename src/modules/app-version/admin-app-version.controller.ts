import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AppVersionService } from './app-version.service';
import { UpsertAppVersionDto } from './dto/upsert-app-version.dto';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin — App Version')
@Controller('admins/app-version')
export class AdminAppVersionController {
  constructor(private readonly service: AppVersionService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha platformalar versiyasini ko\'rish' })
  async getAll() {
    return this.service.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'Versiyani yangilash (upsert by platform)' })
  async upsert(@Body() dto: UpsertAppVersionDto) {
    return this.service.upsert(dto);
  }
}
