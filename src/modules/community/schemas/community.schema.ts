import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommunityDocument = HydratedDocument<Community>;

/**
 * Tuman / mahalla / hudud — Top Communities section'da kartochka ko'rinishida
 * chiqadi. Bir nechta filter (Mashhur + Oilaviy va h.k.) tegishli bo'lishi
 * mumkin.
 */
@Schema({
  timestamps: true,
  collection: 'communities',
})
export class Community {
  @Prop({ type: String, required: true })
  name: string;

  /** Hudud / viloyat. Section'dagi region dropdown'da ishlatiladi. */
  @Prop({ type: String, default: 'Qashqadaryo', index: true })
  region: string;

  /** Yuklangan rasm yo'li (file service URL). */
  @Prop({ type: String, default: null })
  image: string | null;

  @Prop({ type: Number, default: 4.5, min: 0, max: 5 })
  rating: number;

  @Prop({ type: String, default: '' })
  description: string;

  /** 'NEW', 'HOT', 'PREMIUM' kabi rasm ustida ko'rsatiladigan badge. */
  @Prop({ type: String, default: null })
  badge: string | null;

  /**
   * Qidiruv link (search href). Bo'sh bo'lsa frontend default ishlatadi —
   * /filter-nav?category=APARTMENT_SALE&address=<name>.
   */
  @Prop({ type: String, default: null })
  searchHref: string | null;

  /** Tegishli filterlar — bittadan ko'pi mumkin (Mashhur + Oilaviy). */
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'CommunityFilter' }],
    default: [],
    index: true,
  })
  filters: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  propertyCount: number;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CommunitySchema = SchemaFactory.createForClass(Community);
CommunitySchema.index({ region: 1, order: 1 });
CommunitySchema.index({ filters: 1, order: 1 });
