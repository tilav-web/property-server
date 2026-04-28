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
}

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
    files?: { hero_image?: Express.Multer.File[] };
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

    if (files?.hero_image?.[0]) {
      if (settings.hero_image) {
        await this.fileService.deleteFile(settings.hero_image);
      }
      settings.hero_image = await this.fileService.saveFile({
        file: files.hero_image[0],
        folder: EnumFilesFolder.PHOTOS,
      });
    }

    return settings.save();
  }

  async clearHeroImage() {
    const settings = await this.get();
    if (settings.hero_image) {
      await this.fileService.deleteFile(settings.hero_image);
      settings.hero_image = null;
      settings.hero_image_srcset = null;
      await settings.save();
    }
    return settings;
  }
}
