import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    validate: {
      validator: (v: Types.ObjectId[]) => Array.isArray(v) && v.length === 2,
      message: 'Conversation must have exactly two participants',
    },
  })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Property', required: false })
  property?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now, index: true })
  lastMessageAt: Date;

  @Prop({ type: String, default: '' })
  lastMessageSnippet: string;

  @Prop({
    type: Map,
    of: Number,
    default: () => new Map<string, number>(),
  })
  unreadBy: Map<string, number>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Participant-pair lookup
ConversationSchema.index({ participants: 1 });
// Listing user's conversations, newest first
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
