import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpDocument = Otp & Document;

export enum OtpTarget {
  EMAIL = 'email',
  PHONE = 'phone',
}

@Schema({ timestamps: true })
export class Otp {
  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: OtpTarget,
    default: OtpTarget.EMAIL,
  })
  target: OtpTarget;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil?: Date | null;

  @Prop({ type: Date, default: Date.now, expires: 60 })
  createdAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
