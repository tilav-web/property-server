import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';
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
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

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

  @Prop({ type: Number, required: true, min: 0 })
  area: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  bedrooms: number; // Yotoqxona soni

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  bathrooms: number; // Hammom soni

  @Prop({ type: Number, min: 0, default: 0 })
  floor_level: number; // Qavat raqami

  @Prop({ type: [String], default: [] })
  amenities: EnumAmenities[];

  @Prop({
    type: String,
    enum: EnumConstructionStatus,
    default: EnumConstructionStatus.READY,
  })
  construction_status: string; // Qurilish holati

  @Prop({ type: Number, min: 1900 })
  year_built?: number; // Qurilgan yil (ixtiyoriy)

  @Prop({ type: Number, min: 0, default: 0 })
  parking_spaces: number; // Mashina joyi soni

  @Prop({ type: Boolean, default: false })
  is_premium: boolean;

  @Prop({ type: Boolean, default: false })
  is_verified: boolean;

  @Prop({ type: Boolean, default: false }) // *****************************************8
  is_new: boolean; // Yangi e'lon statusi

  @Prop({ type: Boolean, default: false }) // *********************************************8
  is_guest_choice: boolean; // Mehmon tanlovi statusi

  @Prop({ type: Number, default: 0, max: 5 })
  rating: number;

  @Prop({ type: Number, default: 0 })
  reviews_count: number;

  @Prop({ type: String, default: null })
  logo: string;

  @Prop({ type: Date }) // Yangi
  delivery_date?: Date; // Topshirish sanasi

  @Prop({ type: Date }) // Yangi
  sales_date?: Date; // Sotuv boshlanish sanasi

  @Prop({ type: Number, min: 0, default: 0 }) // Yangi
  payment_plans: number; // To'lov rejalari soni
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.virtual('photos', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: false,
  match: { mime_type: { $regex: '^image/' }, document_type: { $ne: 'User' } },
});

PropertySchema.virtual('videos', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: false,
  match: { mime_type: { $regex: '^video/' } },
});

PropertySchema.set('toObject', { virtuals: true });
PropertySchema.set('toJSON', { virtuals: true });
