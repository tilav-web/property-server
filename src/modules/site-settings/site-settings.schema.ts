import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SiteSettingsDocument = SiteSettings & Document;

/**
 * Singleton — DB'da bitta hujjat. SiteSettingsService.getSingleton()
 * yo'q bo'lsa yaratadi.
 */
@Schema({ timestamps: true, collection: 'site_settings' })
export class SiteSettings {
  // Bosh sahifa hero
  @Prop({ type: String, default: null })
  hero_image?: string | null;

  @Prop({ type: String, default: null })
  hero_image_srcset?: string | null;

  @Prop({ type: String, default: null })
  hero_title_override?: string | null;

  @Prop({ type: String, default: null })
  hero_subtitle_override?: string | null;

  // Buy (sotuv) sahifasi hero
  @Prop({ type: String, default: null })
  hero_image_buy?: string | null;

  @Prop({ type: String, default: null })
  hero_image_buy_srcset?: string | null;

  // Rent (ijara) sahifasi hero
  @Prop({ type: String, default: null })
  hero_image_rent?: string | null;

  @Prop({ type: String, default: null })
  hero_image_rent_srcset?: string | null;

  // ============================================================================
  // Premium obuna (umumiy: voice + property + chegirmalar)
  // ----------------------------------------------------------------------------
  // Bir obuna - bir nechta benefit:
  //  - Voice AI cheksiz (aks holda voice_daily_free_limit kuniga)
  //  - Property yaratish cheksiz (aks holda free_property_limit)
  //  - PROPERTY_PREMIUM ("top"ga chiqarish) chegirma bilan (premium_property_discount_percent)
  // Reklama (ADVERTISE) alohida - har bir reklama uchun to'lov.
  // ============================================================================

  /** Voice AI bepul kunlik limit (anonim + login non-premium). */
  @Prop({ type: Number, default: 3, min: 0 })
  voice_daily_free_limit: number;

  /** Bepul user nechta property yarata oladi. */
  @Prop({ type: Number, default: 3, min: 0 })
  free_property_limit: number;

  /** Umumiy premium narxi (DEFAULT_CURRENCY). */
  @Prop({ type: Number, default: 50000, min: 0 })
  premium_price: number;

  /** Premium amal qilish kunlari. */
  @Prop({ type: Number, default: 30, min: 1, max: 365 })
  premium_duration_days: number;

  /**
   * Premium foydalanuvchi uchun PROPERTY_PREMIUM ("top"ga chiqarish)
   * chegirma foizi (0-90). 50 = 50% arzon.
   */
  @Prop({ type: Number, default: 50, min: 0, max: 90 })
  premium_property_discount_percent: number;

  /** @deprecated premium_price'ga ko'chirilgan. Migration uchun saqlangan. */
  @Prop({ type: Number, default: 0 })
  voice_premium_price?: number;

  /** @deprecated premium_duration_days'ga ko'chirilgan. */
  @Prop({ type: Number, default: 0 })
  voice_premium_duration_days?: number;

  // ============================================================================
  // Bosh sahifa "Download the app" sektsiyasi
  // ----------------------------------------------------------------------------
  // App Store / Google Play link'lari va telefon mockup rasmi admin paneldan
  // boshqariladi. Agar URL bo'sh bo'lsa, badge ko'rinmaydi. Agar rasm yo'q
  // bo'lsa, mos blok yashiriladi.
  // ============================================================================
  @Prop({ type: String, default: null })
  app_store_url?: string | null;

  @Prop({ type: String, default: null })
  play_store_url?: string | null;

  /** QR code rasm (admin yuklaydi) — App Store/Play sahifasiga olib boradi. */
  @Prop({ type: String, default: null })
  qr_code_image?: string | null;
}

export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);
