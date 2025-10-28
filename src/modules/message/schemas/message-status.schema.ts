import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageStatusDocument = Document & MessageStatus;

@Schema({ timestamps: true })
export class MessageStatus {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  message: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AppUser', required: true })
  seller: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  is_read: boolean;
}

export const MessageStatusSchema = SchemaFactory.createForClass(MessageStatus);
