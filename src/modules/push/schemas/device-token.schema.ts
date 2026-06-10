import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeviceTokenDocument = HydratedDocument<DeviceToken>;

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

@Schema({ timestamps: true })
export class DeviceToken {
  @Prop({ type: String, required: true, unique: true })
  token: string;

  /** Anonim qurilma uchun null. Login bo'lganda bog'lanadi. */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  })
  user: Types.ObjectId | null;

  @Prop({ type: String, enum: DevicePlatform, required: true })
  platform: DevicePlatform;

  @Prop({ type: String, required: false })
  locale?: string;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);
DeviceTokenSchema.index({ user: 1 });
