import {
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AppVersionService } from './app-version.service';
import { AppPlatform } from './app-version.schema';

@ApiTags('App Version')
@Controller('app-version')
export class AppVersionController {
  constructor(private readonly service: AppVersionService) {}

  /**
   * Mobil ilova start bo'lganda chaqiradi.
   * current_version berilsa needs_update avtomatik hisoblanadi.
   */
  @Get()
  @ApiOperation({ summary: 'Ilova versiyasini tekshirish' })
  @ApiQuery({ name: 'platform', enum: AppPlatform, required: true })
  @ApiQuery({ name: 'current_version', required: false, example: '1.0.0' })
  async check(
    @Query('platform') platform: AppPlatform,
    @Query('current_version') currentVersion?: string,
  ) {
    const result = await this.service.getForPlatform(platform, currentVersion);
    if (!result) throw new NotFoundException('Version info not found for this platform');
    return result;
  }
}
