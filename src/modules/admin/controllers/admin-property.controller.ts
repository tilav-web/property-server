import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Body,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPropertyService } from '../services/admin-property.service';
import { FindPropertiesDto } from '../dto/find-properties.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Properties')
@ApiStandardErrors({ auth: true })
@Controller('admins/properties')
export class AdminPropertyController {
  constructor(private readonly adminPropertyService: AdminPropertyService) {}

  @Get()
  @ApiOperation({ summary: "E'lonlar ro‘yxati (admin)" })
  async findAll(@Query() dto: FindPropertiesDto) {
    return this.adminPropertyService.findAll(dto);
  }

  @Get(‘/user/:userId’)
  @ApiOperation({ summary: ‘Foydalanuvchi bo’yicha e’lonlar’ })
  @ApiStandardErrors({ auth: true, notFound: true })
  async findByUser(@Param(‘userId’) userId: string) {
    return this.adminPropertyService.findByUser(userId);
  }

  @Get(‘:id’)
  @ApiOperation({ summary: 'E’lon tafsiloti' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async findOne(@Param('id') id: string) {
    return this.adminPropertyService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'E’lonni yangilash (admin)' })
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  async update(
    @Param('id') propertyId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.adminPropertyService.update(propertyId, dto);
  }
}
