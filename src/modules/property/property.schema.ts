import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';

export type PropertyDocument = Document & Property;

@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type: string;
  @Prop({ type: [Number, Number], required: true })
  coordinates: [number, number];
}

export const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ timestamps: true })
export class Property {
  @Prop({ type: String, required: true, minlength: 10, maxlength: 40 })
  title: string;

  @Prop({ type: String, required: true, minlength: 40, maxlength: 140 })
  description: string;

  @Prop({
    type: String,
    enum: EnumPropertyCategory,
    required: true,
    default: EnumPropertyCategory.APARTMENT,
  })
  category: string;

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({ type: String, required: true, minlength: 20 })
  address: string;

  @Prop({ type: Number, required: true, default: 0 })
  price: number;

  @Prop({
    type: String,
    required: true,
    enum: EnumPropertyPriceType,
    default: EnumPropertyPriceType.RENT,
  })
  price_type: string;

  @Prop({ type: Boolean, default: false })
  is_premium: boolean;

  @Prop({ type: Boolean, default: false })
  is_verified: boolean;

  @Prop({ type: Number, default: 0, max: 5 })
  rating: number;

  @Prop({ type: Number, default: 0 })
  reviews_count: number;

  @Prop({ type: String, default: null })
  logo: string;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
