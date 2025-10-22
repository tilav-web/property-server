import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumPropertyPurpose } from 'src/enums/property-purpose.enum'; // YANGI
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum'; // YANGI

export type PropertyDocument = Document & Property;

@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type: string;
  @Prop({ type: [Number, Number], required: true })
  coordinates: [number, number];
}

@Schema({ _id: false })
export class Language {
  @Prop({ type: String, required: true })
  uz: string;
  @Prop({ type: String, required: true })
  ru: string;
  @Prop({ type: String, required: true })
  en: string;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ timestamps: true })
export class Property {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: Language, required: true })
  title: Language;

  @Prop({ type: Language, required: true })
  description: Language;

  @Prop({
    type: String,
    enum: EnumPropertyCategory,
    required: true,
    default: EnumPropertyCategory.APARTMENT,
  })
  category: string;

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({ type: Language, required: true })
  address: Language;

  @Prop({ type: Number, required: true, default: 0 })
  price: number;

  @Prop({
    type: String,
    required: true,
    enum: EnumPropertyPurpose,
    default: EnumPropertyPurpose.FOR_RENT,
  })
  purpose: string;

  @Prop({
    type: String,
    required: true,
    default: EnumPropertyCurrency.UZS,
  })
  currency: string;

  @Prop({
    type: String,
    required: true,
    enum: EnumPropertyPriceType,
    default: EnumPropertyPriceType.RENT,
  })
  price_type: string;

  @Prop({ type: Number, required: true, min: 0 })
  area: number;

  @Prop({ type: Number, min: 0, default: 0 })
  bedrooms: number;

  @Prop({ type: Number, min: 0, default: 0 })
  bathrooms: number;

  @Prop({ type: Number, min: 0, default: 0 })
  floor_level: number;

  @Prop({ type: [String], enum: EnumAmenities, default: [] })
  amenities: string[];

  @Prop({
    type: String,
    enum: EnumConstructionStatus,
    default: EnumConstructionStatus.READY,
  })
  construction_status: string;

  @Prop({ type: Number, min: 1900 })
  year_built?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  parking_spaces: number;

  @Prop({ type: Boolean, default: false })
  is_premium: boolean;

  @Prop({ type: Boolean, default: false })
  is_verified: boolean;

  @Prop({ type: Number, default: 0, max: 5 })
  rating: number;

  @Prop({ type: String, default: null })
  logo: string;

  @Prop({ type: Date })
  delivery_date?: Date;

  @Prop({ type: Date })
  sales_date?: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  payment_plans: number;

  @Prop({ type: Types.ObjectId, ref: 'Region', required: true })
  region: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'District', required: true })
  district: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  liked: number;

  @Prop({ type: Number, default: 0 })
  saved: number;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Photos (gallery images)
PropertySchema.virtual('photos', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: false,
  match: {
    document_type: 'Property',
    file_name: /^photos/i, // Match files starting with 'photos'
  },
});

PropertySchema.virtual('contract_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: false, // Can be multiple contract files
  match: {
    document_type: 'Property',
    file_name: /^contract_file/i, // Match files starting with 'contract_file'
  },
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
