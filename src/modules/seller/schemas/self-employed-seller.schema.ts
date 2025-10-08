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
  passport_file: string; // Pasport nusxasi (fayl URL)

  @Prop({ required: true })
  self_employment_certificate: string; // O'zini o'zi bandlik sertifikati (fayl URL)

  @Prop({ required: true })
  has_qqs: boolean; // QQS mavjudmi

  @Prop()
  qqs_file?: string; // QQS fayli (agar mavjud bo‘lsa)
}

export const SelfEmployedSellerSchema =
  SchemaFactory.createForClass(SelfEmployedSeller);
