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
  mchj_license: string; // MCHJ guvohnomasi (fayl URL)

  @Prop({ required: true })
  ustav_file: string; // Ustav fayli

  @Prop({ required: true })
  director_appointment_file: string; // Direktor tayinlash hujjati

  @Prop({ required: true })
  director_passport_file: string; // Direktor pasport nusxasi

  @Prop({ required: true })
  legal_address_file: string; // Yuridik manzil hujjati

  @Prop({ required: true })
  kadastr_file: string; // Kadastr fayli

  @Prop({ required: true })
  has_qqs: boolean; // QQS mavjud

  @Prop()
  qqs_file?: string; // QQS fayli (agar mavjud bo‘lsa)
}

export const MchjSellerSchema = SchemaFactory.createForClass(MchjSeller);
