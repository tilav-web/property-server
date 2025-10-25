import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdvertiseDocument = Document & Advertise;

@Schema({ timestamps: true })
export class Advertise {
  @Prop({ type: String, required: true })
  target: string;
}

export const AdvertiseSchema = SchemaFactory.createForClass(Advertise);
