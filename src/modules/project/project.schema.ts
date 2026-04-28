import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

export enum EnumProjectStatus {
  PRE_LAUNCH = 'pre_launch',
  ON_SALE = 'on_sale',
  SOLD_OUT = 'sold_out',
  COMPLETED = 'completed',
}

export enum EnumProjectUnitCategory {
  APARTMENT = 'apartment',
  TOWNHOUSE = 'townhouse',
  VILLA = 'villa',
  PENTHOUSE = 'penthouse',
  STUDIO = 'studio',
  OFFICE = 'office',
}

@Schema({ _id: false })
export class ProjectUnitType {
  @Prop({ type: String, enum: EnumProjectUnitCategory, required: true })
  category: EnumProjectUnitCategory;

  @Prop({ type: Number, required: false, min: 0 })
  bedrooms_min?: number;

  @Prop({ type: Number, required: false, min: 0 })
  bedrooms_max?: number;

  @Prop({ type: Number, required: false, min: 0 })
  area_min?: number;

  @Prop({ type: Number, required: false, min: 0 })
  area_max?: number;

  @Prop({ type: Number, required: false, min: 0 })
  price_from?: number;

  @Prop({ type: Number, required: false, min: 0 })
  count?: number;
}
export const ProjectUnitTypeSchema =
  SchemaFactory.createForClass(ProjectUnitType);

@Schema({ _id: false })
export class ProjectPaymentPlan {
  // e.g. "10/90", "20/40/40", "Custom"
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  deposit_percent?: number;

  @Prop({ type: String, required: false, maxlength: 500 })
  description?: string;
}
export const ProjectPaymentPlanSchema =
  SchemaFactory.createForClass(ProjectPaymentPlan);

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'Developer', required: true, index: true })
  developer: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  address?: string;

  @Prop({ type: String, required: false })
  country?: string;

  @Prop({ type: String, required: false, index: true })
  city?: string;

  // GeoJSON Point (optional, for future map integration)
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
    required: false,
  })
  location?: { type: 'Point'; coordinates: [number, number] };

  // Off-plan delivery target. Free string ("Q1 2030") for flexibility.
  @Prop({ type: String, required: false })
  delivery_date?: string;

  @Prop({
    type: String,
    enum: EnumProjectStatus,
    default: EnumProjectStatus.ON_SALE,
    index: true,
  })
  status: EnumProjectStatus;

  @Prop({ type: Number, required: false, min: 0 })
  launch_price?: number;

  @Prop({ type: String, required: false, default: 'MYR' })
  currency?: string;

  @Prop({ type: [ProjectUnitTypeSchema], default: [] })
  unit_types: ProjectUnitType[];

  @Prop({ type: [ProjectPaymentPlanSchema], default: [] })
  payment_plans: ProjectPaymentPlan[];

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: String, required: false })
  brochure?: string;

  @Prop({ type: String, required: false })
  video_url?: string;

  @Prop({ type: Boolean, default: false, index: true })
  is_featured: boolean;

  @Prop({ type: Number, default: 0 })
  views: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ name: 'text', description: 'text', address: 'text' });
ProjectSchema.index({ status: 1, is_featured: -1, createdAt: -1 });
