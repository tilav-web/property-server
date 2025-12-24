import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Document & Admin;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({
    type: String,
    select: false,
    required: true,
  })
  password: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
