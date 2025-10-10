import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

export type SellerDocument = Document & Seller;

@Schema({ timestamps: true })
export class Seller {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, uppercase: true })
  passport: string;

  @Prop({
    type: String,
    enum: EnumSellerBusinessType,
    required: true,
    default: EnumSellerBusinessType.YTT,
  })
  business_type: EnumSellerBusinessType;

  @Prop({ type: Boolean, default: false })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  registration_status: boolean;
}

export const SellerSchema = SchemaFactory.createForClass(Seller);

SellerSchema.virtual('bank_account', {
  ref: 'BankAccount',
  localField: '_id',
  foreignField: 'seller',
  justOne: true,
});

SellerSchema.virtual('commissioner', {
  ref: 'Commissioner',
  localField: '_id',
  foreignField: 'seller',
  justOne: true,
});

SellerSchema.virtual('ytt', {
  ref: 'YttSeller',
  localField: '_id',
  foreignField: 'seller',
  justOne: true,
});

SellerSchema.virtual('mchj', {
  ref: 'MchjSeller',
  localField: '_id',
  foreignField: 'seller',
  justOne: true,
});

SellerSchema.virtual('self_employed', {
  ref: 'SelfEmployedSeller',
  localField: '_id',
  foreignField: 'seller',
  justOne: true,
});

SellerSchema.set('toObject', { virtuals: true });
SellerSchema.set('toJSON', { virtuals: true });
