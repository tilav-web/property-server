import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MessageType } from '../enums/message-type.enum';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatMessage {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversation: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({
    type: String,
    enum: MessageType,
    required: true,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  createdAt!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Conversation history pagination (newest first, cursor by _id)
ChatMessageSchema.index({ conversation: 1, _id: -1 });
