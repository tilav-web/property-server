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
}

export const YttSellerSchema = SchemaFactory.createForClass(YttSeller);

YttSellerSchema.virtual('passport_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'YttSeller', file_name: /passport_file/i },
});

YttSellerSchema.virtual('ytt_certificate_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'YttSeller', file_name: /ytt_certificate_file/i },
});

YttSellerSchema.virtual('vat_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'YttSeller', file_name: /vat_file/i },
});

YttSellerSchema.set('toObject', { virtuals: true });
YttSellerSchema.set('toJSON', { virtuals: true });
