import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EnumPropertyCategory } from 'src/modules/property/enums/property-category.enum';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';
import { Language } from 'src/common/language/language.schema';
import { Location } from 'src/common/location/location.schema';
import { EnumPropertyStatus } from '../enums/property-status.enum';

export type PropertyDocument = HydratedDocument<Property>;

export const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ timestamps: true, discriminatorKey: 'category' })
export class Property {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: Language, required: true })
  title: Language;

  @Prop({ type: Language, required: true })
  description: Language;

  @Prop({ type: Language, required: true })
  address: Language;

  @Prop({
    type: String,
    enum: EnumPropertyCategory,
    required: true,
    default: EnumPropertyCategory.APARTMENT_SALE,
  })
  category: EnumPropertyCategory;

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({
    type: String,
    required: true,
    default: EnumPropertyCurrency.RM,
  })
  currency: string;

  @Prop({ type: Number, required: true, default: 0 })
  price: number;

  @Prop({ type: Boolean, default: false })
  is_premium: boolean;

  @Prop({
    type: String,
    enum: EnumPropertyStatus,
    default: EnumPropertyStatus.PENDING,
  })
  status: EnumPropertyStatus;

  @Prop({ type: Boolean, default: false })
  is_archived: boolean;

  @Prop({ type: Number, default: 0, max: 5 })
  rating: number;

  @Prop({ type: Number, default: 0 })
  liked: number;

  @Prop({ type: Number, default: 0 })
  saved: number;

  @Prop({ type: [String], required: true })
  photos: string[];

  @Prop({ type: [String], required: true })
  videos: string[];
}

export const PropertySchema = SchemaFactory.createForClass(Property);
PropertySchema.index({ location: '2dsphere' });
PropertySchema.index({
  'title.uz': 'text',
  'title.ru': 'text',
  'title.en': 'text',
  'description.uz': 'text',
  'description.ru': 'text',
  'description.en': 'text',
  'address.uz': 'text',
  'address.ru': 'text',
  'address.en': 'text',
}, {
  default_language: 'none'
});
