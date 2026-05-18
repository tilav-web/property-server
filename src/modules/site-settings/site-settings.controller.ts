import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SiteSettingsService } from './site-settings.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';
import { ApiMultipartBody } from 'src/common/swagger/file-upload.decorator';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

type HeroSlot = 'main' | 'buy' | 'rent';

@ApiTags('Site Settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly service: SiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Site settings (public)' })
  async getPublic() {
    return this.service.get();
  }

  @UseGuards(AdminGuard)
  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'hero_image', maxCount: 1 },
      { name: 'hero_image_buy', maxCount: 1 },
      { name: 'hero_image_rent', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Update site settings' })
  @ApiBearerAuth('bearer')
  @ApiStandardErrors({ auth: true, validation: true })
  @ApiMultipartBody(UpdateSiteSettingsDto, [
    { name: 'hero_image' },
    { name: 'hero_image_buy' },
    { name: 'hero_image_rent' },
  ])
  async update(
    @Body() dto: UpdateSiteSettingsDto,
    @UploadedFiles()
    files?: {
      hero_image?: Express.Multer.File[];
      hero_image_buy?: Express.Multer.File[];
      hero_image_rent?: Express.Multer.File[];
    },
  ) {
    return this.service.update({ dto, files });
  }

  @UseGuards(AdminGuard)
  @Delete('hero-image/:slot')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Clear hero image by slot' })
  @ApiParam({ name: 'slot', enum: ['main', 'buy', 'rent'] })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  async clearHero(@Param('slot') slot: HeroSlot) {
    return this.service.clearHeroImage(slot);
  }

  // Backward compatibility
  @UseGuards(AdminGuard)
  @Delete('hero-image')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Clear main hero image (legacy)' })
  @ApiStandardErrors({ auth: true })
  async clearMainHero() {
    return this.service.clearHeroImage('main');
  }
}
