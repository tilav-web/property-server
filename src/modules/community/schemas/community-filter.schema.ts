import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommunityFilterDocument = HydratedDocument<CommunityFilter>;

/**
 * Community filtri — "Mashhur", "Arzon", "Biznes uchun" va h.k.
 * Bosh sahifa Top Communities section'da filter pill sifatida ko'rsatiladi.
 */
@Schema({
  timestamps: true,
  collection: 'community_filters',
})
export class CommunityFilter {
  /** Stabil kalit (URL/code'da ishlatish uchun). Misol: "popular", "budget". */
  @Prop({ type: String, required: true, unique: true, index: true })
  key: string;

  /** Foydalanuvchiga ko'rinadigan nomi (mahalliy til). */
  @Prop({ type: String, required: true })
  name: string;

  /**
   * Lucide icon nomi. Frontend dynamic resolve qiladi.
   * Misol: "Award", "Wallet", "Users".
   */
  @Prop({ type: String, default: 'Sparkles' })
  icon: string;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CommunityFilterSchema =
  SchemaFactory.createForClass(CommunityFilter);
CommunityFilterSchema.index({ order: 1 });
