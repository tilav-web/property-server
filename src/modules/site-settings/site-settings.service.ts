import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SiteSettings, SiteSettingsDocument } from './site-settings.schema';
import { FileService } from '../file/file.service';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';

interface UpdatePayload {
  hero_title_override?: string | null;
  hero_subtitle_override?: string | null;
  hero_image_srcset?: string | null;
  hero_image_buy_srcset?: string | null;
  hero_image_rent_srcset?: string | null;
  voice_daily_free_limit?: number;
  free_property_limit?: number;
  premium_price?: number;
  premium_duration_days?: number;
  premium_property_discount_percent?: number;
  app_store_url?: string;
  play_store_url?: string;
  contact_phones?: string[];
  default_map_lat?: number;
  default_map_lng?: number;
  premium_mxik?: string;
  premium_package_code?: string;
  property_premium_mxik?: string;
  property_premium_package_code?: string;
  advertise_mxik?: string;
  advertise_package_code?: string;
  vat_percent?: number;
  telegram_bot_token?: string;
  telegram_admin_chat_ids?: string[];
}

type HeroSlot = 'main' | 'buy' | 'rent';
type HeroImageField = 'hero_image' | 'hero_image_buy' | 'hero_image_rent';
type HeroSrcsetField =
  | 'hero_image_srcset'
  | 'hero_image_buy_srcset'
  | 'hero_image_rent_srcset';

const SLOT_FIELDS: Record<
  HeroSlot,
  { image: HeroImageField; srcset: HeroSrcsetField }
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Singleton — bitta hujjat bo'ladi. Yo'q bo'lsa yaratadi. */
  async get(): Promise<SiteSettingsDocument> {
    let doc = await this.model.findOne();
    if (!doc) doc = await this.model.create({});
    await this.migrateFiscalDefaults(doc);
    return doc;
  }

  /**
   * Bir martalik auto-migration: eski MXIK/package_code default'lari (taxminiy
   * qiymatlar) yangi tasdiqlangan qiymatlarga almashtiriladi. Faqat aniq eski
   * default'lar match qilsa yangilanadi — admin qo'lda kiritgan qiymatlarga
   * tegmaydi.
   */
  private async migrateFiscalDefaults(doc: SiteSettingsDocument): Promise<void> {
    let changed = false;
    const OLD_GENERIC_MXIK = '10399001001000000';
    const OLD_ADVERTISE_MXIK = '10202001001000000';
    const OLD_PACKAGE_CODE = '1';

    if (doc.premium_mxik === OLD_GENERIC_MXIK) {
      doc.premium_mxik = '10305008003000000';
      changed = true;
    }
    if (doc.premium_package_code === OLD_PACKAGE_CODE) {
      doc.premium_package_code = '1546532';
      changed = true;
    }
    if (doc.property_premium_mxik === OLD_GENERIC_MXIK) {
      doc.property_premium_mxik = '10305008003000000';
      changed = true;
    }
    if (doc.property_premium_package_code === OLD_PACKAGE_CODE) {
      doc.property_premium_package_code = '1546532';
      changed = true;
    }
    if (doc.advertise_mxik === OLD_ADVERTISE_MXIK) {
      doc.advertise_mxik = '10305008004000000';
      changed = true;
    }
    if (doc.advertise_package_code === OLD_PACKAGE_CODE) {
      doc.advertise_package_code = '1546606';
      changed = true;
    }
    // vat_percent: agar 0 bo'lsa (eski default) — 12 ga yangilash mumkin
    // emas, chunki admin ataylab 0 qo'ygan bo'lishi mumkin. Faqat MXIK uchun
    // migration qilamiz.

    if (changed) {
      await doc.save();
    }
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
      qr_code_image?: Express.Multer.File[];
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
    if (dto.voice_daily_free_limit !== undefined) {
      settings.voice_daily_free_limit = dto.voice_daily_free_limit;
    }
    if (dto.free_property_limit !== undefined) {
      settings.free_property_limit = dto.free_property_limit;
    }
    if (dto.premium_price !== undefined) {
      settings.premium_price = dto.premium_price;
    }
    if (dto.premium_duration_days !== undefined) {
      settings.premium_duration_days = dto.premium_duration_days;
    }
    if (dto.premium_property_discount_percent !== undefined) {
      settings.premium_property_discount_percent =
        dto.premium_property_discount_percent;
    }
    if (dto.app_store_url !== undefined) {
      settings.app_store_url = dto.app_store_url || null;
    }
    if (dto.play_store_url !== undefined) {
      settings.play_store_url = dto.play_store_url || null;
    }
    if (dto.contact_phones !== undefined) {
      settings.contact_phones = dto.contact_phones.filter(Boolean);
    }
    if (dto.default_map_lat !== undefined) {
      settings.default_map_lat = dto.default_map_lat;
    }
    if (dto.default_map_lng !== undefined) {
      settings.default_map_lng = dto.default_map_lng;
    }

    // Payme fiskal
    if (dto.premium_mxik !== undefined) {
      settings.premium_mxik = dto.premium_mxik;
    }
    if (dto.premium_package_code !== undefined) {
      settings.premium_package_code = dto.premium_package_code;
    }
    if (dto.property_premium_mxik !== undefined) {
      settings.property_premium_mxik = dto.property_premium_mxik;
    }
    if (dto.property_premium_package_code !== undefined) {
      settings.property_premium_package_code = dto.property_premium_package_code;
    }
    if (dto.advertise_mxik !== undefined) {
      settings.advertise_mxik = dto.advertise_mxik;
    }
    if (dto.advertise_package_code !== undefined) {
      settings.advertise_package_code = dto.advertise_package_code;
    }
    if (dto.vat_percent !== undefined) {
      settings.vat_percent = dto.vat_percent;
    }

    // Telegram admin bot
    let telegramChanged = false;
    if (dto.telegram_bot_token !== undefined) {
      const next = dto.telegram_bot_token.trim() || null;
      if (next !== settings.telegram_bot_token) telegramChanged = true;
      settings.telegram_bot_token = next;
    }
    if (dto.telegram_admin_chat_ids !== undefined) {
      settings.telegram_admin_chat_ids = dto.telegram_admin_chat_ids
        .map((id) => id.trim())
        .filter(Boolean);
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
    await this.replaceFile(
      settings,
      'qr_code_image',
      files?.qr_code_image?.[0],
    );

    const saved = await settings.save();

    // Token o'zgargan bo'lsa Telegram webhook qayta ro'yxatdan o'tkaziladi
    // (telegram-admin.service tinglaydi)
    if (telegramChanged) {
      this.eventEmitter.emit('telegram.settings.updated');
    }

    return saved;
  }

  async clearHeroImage(slot: HeroSlot) {
    const settings = await this.get();
    const cfg = SLOT_FIELDS[slot];
    if (!cfg) return settings;

    const current = settings[cfg.image];
    if (current) {
      await this.fileService.deleteFile(current);
      (settings as unknown as Record<string, string | null>)[cfg.image] = null;
      (settings as unknown as Record<string, string | null>)[cfg.srcset] = null;
      await settings.save();
    }
    return settings;
  }

  private async replaceFile(
    settings: SiteSettingsDocument,
    field:
      | 'hero_image'
      | 'hero_image_buy'
      | 'hero_image_rent'
      | 'qr_code_image',
    file: Express.Multer.File | undefined,
  ) {
    if (!file) return;
    const existing = settings[field];
    if (existing) {
      await this.fileService.deleteFile(existing);
    }
    settings[field] = await this.fileService.saveFile({
      file,
      folder: EnumFilesFolder.PHOTOS,
    });
  }
}
