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
import { AdminSellerService } from '../services/admin-seller.service';
import { FindSellersDto } from '../dto/find-sellers.dto';
import { UpdateSellerDto } from '../dto/update-seller.dto';

@UseGuards(AdminGuard)
@Controller('admins/sellers')
export class AdminSellerController {
  constructor(private readonly adminSellerService: AdminSellerService) {}

  @Get()
  async findAll(@Query() dto: FindSellersDto) {
    return this.adminSellerService.findAll(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminSellerService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') sellerId: string, @Body() dto: UpdateSellerDto) {
    return this.adminSellerService.update(sellerId, dto);
  }
}
