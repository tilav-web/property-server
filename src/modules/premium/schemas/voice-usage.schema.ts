import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VoiceUsageDocument = HydratedDocument<VoiceUsage>;

/**
 * Voice AI ishlatilishi kunlik counter.
 *  - key: "user:<userId>" yoki "ip:<ipAddress>" formatida
 *  - day: YYYY-MM-DD (server timezone)
 *  - count: shu kuni qancha voice yuborilgan
 *
 * Bitta (key, day) jufti uchun bitta hujjat — atomic $inc bilan oshiriladi.
 * TTL index 7 kundan keyin avtomatik o'chiradi.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'voice_usage' })
export class VoiceUsage {
  @Prop({ type: String, required: true, index: true })
  key: string;

  @Prop({ type: String, required: true, index: true })
  day: string;

  @Prop({ type: Number, default: 0, min: 0 })
  count: number;

  createdAt!: Date;
}

export const VoiceUsageSchema = SchemaFactory.createForClass(VoiceUsage);

VoiceUsageSchema.index({ key: 1, day: 1 }, { unique: true });
// 7 kun keyin avtomatik o'chish (TTL) — eski statistikani saqlashga hojat yo'q
VoiceUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
