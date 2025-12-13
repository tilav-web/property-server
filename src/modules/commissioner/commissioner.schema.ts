import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommissionerDocument = Document & Commissioner;

@Schema({ timestamps: true })
export class Commissioner {
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  @Prop({ type: String, required: true, default: '311439965' })
  inn_or_jshshir: string;

  @Prop({
    type: String,
    required: true,
    default: 'AUTOMATIC TECHNOLOGY SOLUIONS MCHJ',
  })
  company: string;

  @Prop({ type: String, required: true, trim: true, default: '00401' })
  mfo: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    default: '20208000707099742001',
  })
  account_number: string;

  @Prop({ type: String, required: true })
  contract_number: string;

  @Prop({
    type: String,
    required: true,
  })
  contract_start_date: string;

  @Prop({
    type: String,
    required: true,
  })
  contract_end_date: string;

  @Prop({
    type: String,
    required: true,
  })
  contract_file: string;
}

export const CommissionerSchema = SchemaFactory.createForClass(Commissioner);
