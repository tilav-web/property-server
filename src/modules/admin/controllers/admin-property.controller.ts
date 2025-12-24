import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPropertyService } from '../services/admin-property.service';
import { FindPropertiesDto } from '../dto/find-properties.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';

@UseGuards(AdminGuard)
@Controller('admins/properties')
export class AdminPropertyController {
  constructor(private readonly adminPropertyService: AdminPropertyService) {}

  @Get()
  async findAll(@Query() dto: FindPropertiesDto) {
    return this.adminPropertyService.findAll(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') propertyId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.adminPropertyService.update(propertyId, dto);
  }
}
