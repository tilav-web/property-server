import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';

export type AdvertiseDocument = Document & Advertise;

@Schema({ timestamps: true })
export class Advertise {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: String, required: true })
  target: string;

  @Prop({
    type: String,
    required: true,
    default: EnumAdvertiseType.BANNER,
    enum: EnumAdvertiseType,
  })
  type: EnumAdvertiseType;

  @Prop({
    type: String,
    required: true,
    enum: EnumAdvertiseStatus,
    default: EnumAdvertiseStatus.PENDING,
  })
  status: EnumAdvertiseStatus;

  @Prop({ type: Number, required: true, default: 1 })
  days: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({
    type: String,
    required: true,
    default: EnumPropertyCurrency.UZS,
  })
  currency: string;

  @Prop({
    type: String,
    enum: EnumPaymentStatus,
    default: EnumPaymentStatus.PENDING,
  })
  payment_status: EnumPaymentStatus;

  @Prop({ type: Date, required: false, default: null })
  from: Date;

  @Prop({ type: Date, required: false, default: null })
  to: Date;

  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: Number, default: 0 })
  views: number;

  @Prop({ type: Number, default: 0 })
  clicks: number;
}

export const AdvertiseSchema = SchemaFactory.createForClass(Advertise);
