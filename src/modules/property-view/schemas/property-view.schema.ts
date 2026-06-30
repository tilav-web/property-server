import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyViewDocument = Document & PropertyView;

@Schema({ timestamps: false })
export class PropertyView {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  propertyId: Types.ObjectId;

  // Auth user uchun userId, anonim uchun SHA256(IP)
  @Prop({ type: String, required: true })
  viewerId: string;

  @Prop({ type: Date, default: () => new Date() })
  viewedAt: Date;
}

export const PropertyViewSchema = SchemaFactory.createForClass(PropertyView);

// Bir user/IP 30 kun ichida bir marta hisoblanadi
PropertyViewSchema.index({ propertyId: 1, viewerId: 1 }, { unique: true });
// 30 kundan keyin avtomatik o'chadi
PropertyViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 2592000 });
