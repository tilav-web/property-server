import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumLan } from 'src/enums/lan.enum';
import { EnumRole } from 'src/enums/role.enum';

export type UserDocument = Document & AppUser;

@Schema({ _id: false })
export class Email {
  @Prop({ type: String })
  value: string;
  @Prop({ type: Boolean, default: false })
  isVerified: boolean;
}

export const EmailSchema = SchemaFactory.createForClass(Email);

@Schema({ _id: false })
export class Phone {
  @Prop({ type: String, sparse: true, default: null })
  value: string;
  @Prop({ type: Boolean, default: false })
  isVerified: boolean;
}

export const PhoneSchema = SchemaFactory.createForClass(Phone);

@Schema({ timestamps: true, collection: 'appusers' })
export class AppUser {
  @Prop({ type: String, default: null })
  first_name: string;

  @Prop({ type: String, default: null })
  last_name: string;

  @Prop({ type: PhoneSchema, default: { value: null, isVerified: false } })
  phone: Phone;

  @Prop({ type: String, default: null })
  avatar: string;

  @Prop({ type: String, required: true, default: EnumRole.PHYSICAL })
  role: EnumRole;

  @Prop({ type: String, required: true, default: EnumLan.UZ })
  lan: EnumLan;

  @Prop({ type: EmailSchema, required: true })
  email: Email;

  @Prop({ type: Types.ObjectId, ref: 'Region' })
  region: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'District' })
  district: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(AppUser);
