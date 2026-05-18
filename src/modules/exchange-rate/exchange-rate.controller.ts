import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExchangeRateService } from './exchange-rate.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { type IAdminRequestCustom } from '../../interfaces/admin-request.interface';
import { CurrencyCode } from 'src/common/currencies/currency.enum';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

interface UpdateExchangeRateDto {
  rates?: Partial<Record<CurrencyCode, number>>;
  notes?: string;
}

@ApiTags('Exchange Rates')
@Controller('exchange-rates')
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get()
  @ApiOperation({ summary: 'Joriy valyuta kurslari (public)' })
  async getPublic() {
    return this.service.get();
  }

  @UseGuards(AdminGuard)
  @Patch()
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Valyuta kurslarini yangilash (admin)' })
  @ApiStandardErrors({ auth: true, validation: true })
  async update(
    @Body() dto: UpdateExchangeRateDto,
    @Req() req: IAdminRequestCustom,
  ) {
    const adminId = req.admin?._id as string;
    return this.service.update(dto, adminId);
  }
}
