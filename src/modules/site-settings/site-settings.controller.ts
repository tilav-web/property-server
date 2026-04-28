import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SiteSettingsService } from './site-settings.service';
import { AdminGuard } from '../admin/guards/admin.guard';

interface UpdateSiteSettingsDto {
  hero_title_override?: string;
  hero_subtitle_override?: string;
  hero_image_srcset?: string;
}

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly service: SiteSettingsService) {}

  @Get()
  async getPublic() {
    return this.service.get();
  }

  @UseGuards(AdminGuard)
  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'hero_image', maxCount: 1 }]),
  )
  async update(
    @Body() dto: UpdateSiteSettingsDto,
    @UploadedFiles()
    files?: { hero_image?: Express.Multer.File[] },
  ) {
    return this.service.update({ dto, files });
  }

  @UseGuards(AdminGuard)
  @Delete('hero-image')
  async clearHero() {
    return this.service.clearHeroImage();
  }
}
