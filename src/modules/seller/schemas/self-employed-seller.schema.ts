import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SelfEmployedSellerDocument = Document & SelfEmployedSeller;

@Schema({ timestamps: true })
export class SelfEmployedSeller {
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  @Prop({ required: true })
  first_name: string; // Ism

  @Prop({ required: true })
  last_name: string; // Familiya

  @Prop({ required: true })
  middle_name: string; // Otasining ismi

  @Prop({ required: true })
  birth_date: Date; // Tug'ilgan sana (mm/dd/yyyy)

  @Prop({ required: true })
  jshshir: string; // JShShIR

  @Prop({ required: true })
  registration_number: string; // Ro'yxatdan o'tish raqami

  @Prop({ required: true })
  registration_address: string; // Biznes ro'yxatdan o'tgan manzili

  @Prop({ required: true })
  is_vat_payer: boolean; // QQS mavjudmi
}

export const SelfEmployedSellerSchema =
  SchemaFactory.createForClass(SelfEmployedSeller);

SelfEmployedSellerSchema.virtual('passport_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'SelfEmployedSeller', file_name: /passport_file/i },
});

SelfEmployedSellerSchema.virtual('self_employment_certificate', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: {
    document_type: 'SelfEmployedSeller',
    file_name: /self_employment_certificate/i,
  },
});

SelfEmployedSellerSchema.virtual('vat_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'SelfEmployedSeller', file_name: /vat_file/i },
});

SelfEmployedSellerSchema.set('toObject', { virtuals: true });
SelfEmployedSellerSchema.set('toJSON', { virtuals: true });
