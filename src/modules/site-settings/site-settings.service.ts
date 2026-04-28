import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SiteSettings,
  SiteSettingsDocument,
} from './site-settings.schema';
import { FileService } from '../file/file.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';

interface UpdatePayload {
  hero_title_override?: string | null;
  hero_subtitle_override?: string | null;
  hero_image_srcset?: string | null;
  hero_image_buy_srcset?: string | null;
  hero_image_rent_srcset?: string | null;
}

type HeroSlot = 'main' | 'buy' | 'rent';

const SLOT_FIELDS: Record<
  HeroSlot,
  { image: keyof SiteSettings; srcset: keyof SiteSettings }
> = {
  main: { image: 'hero_image', srcset: 'hero_image_srcset' },
  buy: { image: 'hero_image_buy', srcset: 'hero_image_buy_srcset' },
  rent: { image: 'hero_image_rent', srcset: 'hero_image_rent_srcset' },
};

@Injectable()
export class SiteSettingsService {
  constructor(
    @InjectModel(SiteSettings.name)
    private readonly model: Model<SiteSettingsDocument>,
    private readonly fileService: FileService,
  ) {}

  /** Singleton — bitta hujjat bo'ladi. Yo'q bo'lsa yaratadi. */
  async get(): Promise<SiteSettingsDocument> {
    let doc = await this.model.findOne();
    if (!doc) doc = await this.model.create({});
    return doc;
  }

  async update({
    dto,
    files,
  }: {
    dto: UpdatePayload;
    files?: {
      hero_image?: Express.Multer.File[];
      hero_image_buy?: Express.Multer.File[];
      hero_image_rent?: Express.Multer.File[];
    };
  }) {
    const settings = await this.get();

    if (dto.hero_title_override !== undefined) {
      settings.hero_title_override = dto.hero_title_override || null;
    }
    if (dto.hero_subtitle_override !== undefined) {
      settings.hero_subtitle_override = dto.hero_subtitle_override || null;
    }
    if (dto.hero_image_srcset !== undefined) {
      settings.hero_image_srcset = dto.hero_image_srcset || null;
    }
    if (dto.hero_image_buy_srcset !== undefined) {
      settings.hero_image_buy_srcset = dto.hero_image_buy_srcset || null;
    }
    if (dto.hero_image_rent_srcset !== undefined) {
      settings.hero_image_rent_srcset = dto.hero_image_rent_srcset || null;
    }

    await this.replaceFile(settings, 'hero_image', files?.hero_image?.[0]);
    await this.replaceFile(
      settings,
      'hero_image_buy',
      files?.hero_image_buy?.[0],
    );
    await this.replaceFile(
      settings,
      'hero_image_rent',
      files?.hero_image_rent?.[0],
    );

    return settings.save();
  }

  async clearHeroImage(slot: HeroSlot) {
    const settings = await this.get();
    const cfg = SLOT_FIELDS[slot];
    if (!cfg) return settings;

    const current = settings[cfg.image] as string | null | undefined;
    if (current) {
      await this.fileService.deleteFile(current);
      (settings as unknown as Record<string, string | null>)[cfg.image] = null;
      (settings as unknown as Record<string, string | null>)[cfg.srcset] =
        null;
      await settings.save();
    }
    return settings;
  }

  private async replaceFile(
    settings: SiteSettingsDocument,
    field: 'hero_image' | 'hero_image_buy' | 'hero_image_rent',
    file: Express.Multer.File | undefined,
  ) {
    if (!file) return;
    const existing = settings[field] as string | null | undefined;
    if (existing) {
      await this.fileService.deleteFile(existing);
    }
    settings[field] = await this.fileService.saveFile({
      file,
      folder: EnumFilesFolder.PHOTOS,
    });
  }
}
