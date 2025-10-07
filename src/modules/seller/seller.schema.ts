import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

export type SellerDocument = Document & Seller;

@Schema({ timestamps: true })
export class Seller {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: EnumSellerBusinessType,
    required: true,
    default: EnumSellerBusinessType.YTT,
  })
  business_type: EnumSellerBusinessType;

  @Prop({ type: String, required: true })
  passport: string;
}

export const SellerSchema = SchemaFactory.createForClass(Seller);
