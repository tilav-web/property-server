import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type YttSellerDocument = Document & YttSeller;

@Schema({ timestamps: true })
export class YttSeller {
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  @Prop({ required: true })
  company_name: string; // Korxona nomi

  @Prop({ required: true })
  inn: string; // STIR

  @Prop({ required: true })
  pinfl: string; // JShShIR

  @Prop({ required: true })
  business_reg_number: string; // Ro'yxatdan o'tish raqami

  @Prop({ required: true })
  business_reg_address: string; // Ro'yxatdan o'tgan manzil

  @Prop({ required: true })
  is_vat_payer: boolean; // QQS mavjudmi

  @Prop({ type: String, required: false })
  passport_file: string;

  @Prop({ type: String, required: false })
  ytt_certificate_file: string;

  @Prop({ type: String, required: false })
  vat_file: string;
}

export const YttSellerSchema = SchemaFactory.createForClass(YttSeller);
