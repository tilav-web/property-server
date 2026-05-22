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
  // Voice AI premium
  // ----------------------------------------------------------------------------
  // Voice (Whisper + TTS) OpenAI'da ~$0.02 turadi. Bepul limit anonim user va
  // login user uchun bir xil — voice_daily_free_limit kuniga. Premium upgrade
  // qilingan login user uchun cheksiz (voice_premium_duration_days davomida).
  // Narx mamlakatga qarab DEFAULT_CURRENCY'da olinadi.
  // ============================================================================
  @Prop({ type: Number, default: 3, min: 0 })
  voice_daily_free_limit: number;

  @Prop({ type: Number, default: 20000, min: 0 })
  voice_premium_price: number;

  @Prop({ type: Number, default: 30, min: 1, max: 365 })
  voice_premium_duration_days: number;

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
