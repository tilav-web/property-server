import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MchjSellerDocument = Document & MchjSeller;

@Schema({ timestamps: true })
export class MchjSeller {
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  @Prop({ required: true })
  company_name: string; // Kompaniya nomi

  @Prop({ required: true })
  stir: string; // STIR

  @Prop({ required: true })
  oked: string; // OKED

  @Prop({ required: true })
  registration_address: string; // Biznes ro'yxatdan o'tgan manzili

  @Prop({ required: true })
  is_vat_payer: boolean; // QQS mavjudmi
}

export const MchjSellerSchema = SchemaFactory.createForClass(MchjSeller);

MchjSellerSchema.virtual('ustav_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'MchjSeller', file_name: /ustav_file/i },
});

MchjSellerSchema.virtual('mchj_license', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'MchjSeller', file_name: /mchj_license/i },
});

MchjSellerSchema.virtual('director_appointment_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: {
    document_type: 'MchjSeller',
    file_name: /director_appointment_file/i,
  },
});

MchjSellerSchema.virtual('director_passport_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'MchjSeller', file_name: /director_passport_file/i },
});

MchjSellerSchema.virtual('legal_address_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'MchjSeller', file_name: /legal_address_file/i },
});

MchjSellerSchema.virtual('kadastr_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'MchjSeller', file_name: /kadastr_file/i },
});

MchjSellerSchema.virtual('vat_file', {
  ref: 'File',
  localField: '_id',
  foreignField: 'document_id',
  justOne: true,
  match: { document_type: 'MchjSeller', file_name: /vat_file/i },
});

MchjSellerSchema.set('toObject', { virtuals: true });
MchjSellerSchema.set('toJSON', { virtuals: true });
