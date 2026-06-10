import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BroadcastNotificationDocument =
  HydratedDocument<BroadcastNotification>;

export enum BroadcastTargetGroup {
  ALL = 'all',
  PREMIUM = 'premium',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class BroadcastNotification {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: String, required: false })
  imageUrl?: string;

  @Prop({
    type: String,
    enum: BroadcastTargetGroup,
    required: true,
    default: BroadcastTargetGroup.ALL,
  })
  targetGroup: BroadcastTargetGroup;

  @Prop({ type: Number, default: 0 })
  sentCount: number;

  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  createdBy?: Types.ObjectId;
}

export const BroadcastNotificationSchema = SchemaFactory.createForClass(
  BroadcastNotification,
);
