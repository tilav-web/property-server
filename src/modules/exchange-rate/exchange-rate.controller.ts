import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { type IAdminRequestCustom } from '../../interfaces/admin-request.interface';
import { CurrencyCode } from 'src/common/currencies/currency.enum';

interface UpdateExchangeRateDto {
  rates?: Partial<Record<CurrencyCode, number>>;
  notes?: string;
}

@Controller('exchange-rates')
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get()
  async getPublic() {
    return this.service.get();
  }

  @UseGuards(AdminGuard)
  @Patch()
  async update(
    @Body() dto: UpdateExchangeRateDto,
    @Req() req: IAdminRequestCustom,
  ) {
    const adminId = req.admin?._id as string;
    return this.service.update(dto, adminId);
  }
}
