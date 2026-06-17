import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppVersionDocument = HydratedDocument<AppVersion>;

export enum AppPlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

/**
 * Per-platform singleton — DB'da ikkita hujjat: ios va android.
 * Upsert orqali yangilanadi, yangi hujjat yaratilmaydi.
 */
@Schema({ timestamps: true, collection: 'app_versions' })
export class AppVersion {
  @Prop({ type: String, enum: AppPlatform, required: true, unique: true })
  platform: AppPlatform;

  /** Semantic version: "1.2.3" */
  @Prop({ type: String, required: true })
  version: string;

  /** App Store yoki Google Play URL */
  @Prop({ type: String, required: true })
  store_url: string;

  /**
   * true → user yangilamasa ilovadan foydalana olmaydi (majburiy).
   * false → tavsiya qilinadi, lekin o'tkazib yuborish mumkin.
   */
  @Prop({ type: Boolean, default: false })
  is_force_update: boolean;

  /** Yangiliklar matni (ixtiyoriy, admin to'ldiradi) */
  @Prop({ type: String, default: null })
  release_notes: string | null;
}

export const AppVersionSchema = SchemaFactory.createForClass(AppVersion);
