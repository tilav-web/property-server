import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankAccountDocument = Document & BankAccount;

@Schema({ timestamps: true })
export class BankAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  account_number: string;

  @Prop({ type: String, required: true, trim: true })
  bank_name: string;

  @Prop({ type: String, required: true, trim: true })
  mfo: string;

  @Prop({ type: String, required: true, trim: true })
  owner_full_name: string;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  swift_code: string;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);
