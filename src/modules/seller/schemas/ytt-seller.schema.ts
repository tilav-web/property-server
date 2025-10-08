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
  passport_file: string; // Pasport nusxasi (URL yoki fayl yo‘li)

  @Prop({ required: true })
  ytt_certificate_file: string; // YTT guvohnomasi (URL yoki fayl yo‘li)

  @Prop({ required: true })
  is_vat_payer: boolean; // QQS mavjudmi

  @Prop()
  vat_file?: string; // QQS fayli (agar mavjud bo‘lsa)
}

export const YttSellerSchema = SchemaFactory.createForClass(YttSeller);
