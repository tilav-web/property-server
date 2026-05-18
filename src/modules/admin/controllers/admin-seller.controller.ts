import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminSellerService } from '../services/admin-seller.service';
import { FindSellersDto } from '../dto/find-sellers.dto';
import { UpdateSellerDto } from '../dto/update-seller.dto';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

@UseGuards(AdminGuard)
@ApiBearerAuth('bearer')
@ApiTags('Admin Sellers')
@ApiStandardErrors({ auth: true })
@Controller('admins/sellers')
export class AdminSellerController {
  constructor(private readonly adminSellerService: AdminSellerService) {}

  @Get()
  @ApiOperation({ summary: 'Sotuvchilar ro‘yxati (admin)' })
  async findAll(@Query() dto: FindSellersDto) {
    return this.adminSellerService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sotuvchi tafsiloti (admin)' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async findOne(@Param('id') id: string) {
    return this.adminSellerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sotuvchini yangilash (admin)' })
  @ApiStandardErrors({ auth: true, notFound: true, validation: true })
  async update(@Param('id') sellerId: string, @Body() dto: UpdateSellerDto) {
    return this.adminSellerService.update(sellerId, dto);
  }
}
