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

  @Prop({ type: String, required: false })
  passport_file: string;

  @Prop({ type: String, required: false })
  self_employment_certificate: string;
}

export const SelfEmployedSellerSchema =
  SchemaFactory.createForClass(SelfEmployedSeller);
