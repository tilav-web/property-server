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

  @Prop({ type: String, required: false })
  ustav_file: string;

  @Prop({ type: String, required: false })
  mchj_license: string;

  @Prop({ type: String, required: false })
  director_appointment_file: string;

  @Prop({ type: String, required: false })
  director_passport_file: string;

  @Prop({ type: String, required: false })
  legal_address_file: string;

  @Prop({ type: String, required: false })
  kadastr_file: string;

  @Prop({ type: String, required: false })
  vat_file: string;
}

export const MchjSellerSchema = SchemaFactory.createForClass(MchjSeller);
