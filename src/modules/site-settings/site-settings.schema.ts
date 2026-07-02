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
  // Aloqa telefon raqamlari (header + footer'da ko'rinadi)
  // ============================================================================
  @Prop({ type: [String], default: [] })
  contact_phones: string[];

  // ============================================================================
  // Default xarita markazi (barcha map sahifalari uchun)
  // ============================================================================
  @Prop({ type: Number, default: 38.8447459 })
  default_map_lat: number;

  @Prop({ type: Number, default: 65.780332 })
  default_map_lng: number;

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

  // ============================================================================
  // Payme fiskal ma'lumotlari (CheckPerformTransaction detail uchun)
  // ----------------------------------------------------------------------------
  // Payme har bir to'lov uchun chek (oborotda ko'rinishi uchun) talab qiladi:
  // MXIK kod (mahsulot/xizmat tasnif), package_code (o'lchov birligi —
  // MXIK ga bog'liq), VAT % (QQS foizi).
  // Admin tasnif.soliq.uz/attribute/<mxik> da haqiqiy qiymatlarni tasdiqlashi
  // kerak. Default'lar — taxminiy umumiy xizmat MXIK'lari (admin tahrirlasin).
  // ============================================================================

  /**
   * Premium obuna uchun MXIK kodi (17 xonali).
   * 10305008003000000 — Dasturiy ta'minotdan foydalanish huquqini
   * (litsenziya, sublitsenziya) taqdim etish/ruxsat berish xizmatlari.
   */
  @Prop({ type: String, default: '10305008003000000' })
  premium_mxik: string;

  /**
   * Premium obuna uchun package_code.
   * 1546532 — "xizmat (so'm)" o'lchov birligi (MXIK 10305008003000000 uchun).
   * Boshqa variantlar: 1545646 (xizmat marta), 1546450 (dona).
   */
  @Prop({ type: String, default: '1546532' })
  premium_package_code: string;

  /** Property TOP (PROPERTY_PREMIUM) uchun MXIK kodi (Premium bilan bir xil). */
  @Prop({ type: String, default: '10305008003000000' })
  property_premium_mxik: string;

  /** Property TOP uchun package_code (xizmat — so'm). */
  @Prop({ type: String, default: '1546532' })
  property_premium_package_code: string;

  /**
   * Reklama (ADVERTISE) uchun MXIK kodi.
   * 10305008004000000 — Dasturiy ta'minotda mijoz tomonidan taqdim etilgan
   * reklama va e'lonlarni joylashtirish xizmatlari.
   */
  @Prop({ type: String, default: '10305008004000000' })
  advertise_mxik: string;

  /** Reklama uchun package_code. 1546606 — xizmat (so'm). */
  @Prop({ type: String, default: '1546606' })
  advertise_package_code: string;

  /**
   * QQS foizi. Default 12% — Soliq kodeksi bo'yicha shu MXIK'lar uchun
   * imtiyoz yo'q, standart stavka qo'llaniladi.
   */
  @Prop({ type: Number, default: 12, min: 0, max: 30 })
  vat_percent: number;

  // ============================================================================
  // Telegram admin bot (super admin xabarnomalari)
  // ----------------------------------------------------------------------------
  // Token va chat ID'lar admin paneldan kiritiladi. DIQQAT: bu maydonlar
  // public GET /site-settings javobidan olib tashlanadi (controller sanitize
  // qiladi) — faqat GET /site-settings/admin to'liq qaytaradi.
  // ============================================================================

  /** BotFather'dan olingan bot token. */
  @Prop({ type: String, default: null })
  telegram_bot_token?: string | null;

  /** Xabar boradigan admin chat ID'lari. */
  @Prop({ type: [String], default: [] })
  telegram_admin_chat_ids: string[];
}

export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);
