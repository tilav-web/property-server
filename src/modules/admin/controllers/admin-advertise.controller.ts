import {
  Controller,
  Get,
  Query,
  UseGuards,
  Put, // Changed from Patch
  Param,
  Body,
} from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { AdminAdvertiseService } from '../services/admin-advertise.service';
import { FindAdvertisesDto } from '../dto/find-advertises.dto';
import { UpdateAdvertiseStatusDto } from '../dto/update-advertise-status.dto';

@UseGuards(AdminGuard)
@Controller('admins/advertises')
export class AdminAdvertiseController {
  constructor(private readonly adminAdvertiseService: AdminAdvertiseService) {}

  @Get()
  async findAll(@Query() dto: FindAdvertisesDto) {
    return this.adminAdvertiseService.findAll(dto);
  }

  @Put(':id/status') // Changed from Patch
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
