import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Document & Message;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;

  @Prop({ type: String, required: true, minlength: 5, maxlength: 500 })
  text: string;

  @Prop({ type: Number, required: true, default: 1, min: 1, max: 5 })
  rating: number;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
