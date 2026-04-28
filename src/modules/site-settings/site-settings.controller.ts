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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SiteSettingsService } from './site-settings.service';
import { AdminGuard } from '../admin/guards/admin.guard';

interface UpdateSiteSettingsDto {
  hero_title_override?: string;
  hero_subtitle_override?: string;
  hero_image_srcset?: string;
  hero_image_buy_srcset?: string;
  hero_image_rent_srcset?: string;
}

type HeroSlot = 'main' | 'buy' | 'rent';

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
    FileFieldsInterceptor([
      { name: 'hero_image', maxCount: 1 },
      { name: 'hero_image_buy', maxCount: 1 },
      { name: 'hero_image_rent', maxCount: 1 },
    ]),
  )
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
  async clearHero(@Param('slot') slot: HeroSlot) {
    return this.service.clearHeroImage(slot);
  }

  // Backward compatibility
  @UseGuards(AdminGuard)
  @Delete('hero-image')
  async clearMainHero() {
    return this.service.clearHeroImage('main');
  }
}
