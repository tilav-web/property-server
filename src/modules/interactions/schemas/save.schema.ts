import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaveDocument = Document & Save;

@Schema({ timestamps: true })
export class Save {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;
}

export const SaveSchema = SchemaFactory.createForClass(Save);
