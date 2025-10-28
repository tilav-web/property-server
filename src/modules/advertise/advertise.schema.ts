import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';

export type AdvertiseDocument = Document & Advertise;

@Schema({ timestamps: true })
export class Advertise {
  @Prop({ type: Types.ObjectId, ref: 'AppUser', required: true })
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
}

export const AdvertiseSchema = SchemaFactory.createForClass(Advertise);

AdvertiseSchema.virtual('image', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: {
    document_type: 'Advertise',
    file_name: /^advertise/i,
  },
});
