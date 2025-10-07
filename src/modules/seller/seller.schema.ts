import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SellerDocument = Document & Seller;

@Schema({ timestamps: true })
export class Seller {}

export const SellerSchema = SchemaFactory.createForClass(Seller);
