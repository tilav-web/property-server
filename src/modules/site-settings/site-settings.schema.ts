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
}

export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);
