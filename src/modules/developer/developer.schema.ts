import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeveloperDocument = Developer & Document;

@Schema({ timestamps: true, collection: 'developers' })
export class Developer {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  logo?: string;

  @Prop({ type: String, required: false })
  cover?: string;

  @Prop({ type: String, required: false })
  website?: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  telegram?: string;

  @Prop({ type: String, required: false })
  whatsapp?: string;

  @Prop({ type: String, required: false })
  country?: string;

  @Prop({ type: String, required: false })
  city?: string;

  // Cache: a count of active projects (kept fresh by ProjectService)
  @Prop({ type: Number, default: 0 })
  projects_count: number;

  @Prop({ type: Boolean, default: true, index: true })
  is_active: boolean;
}

export const DeveloperSchema = SchemaFactory.createForClass(Developer);
DeveloperSchema.index({ name: 'text', description: 'text' });
