import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EnumLan } from 'src/enums/lan.enum';
import { EnumRole } from 'src/enums/role.enum';

export type UserDocument = Document & User;

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

@Schema({ timestamps: true })
export class User {
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

  @Prop({ type: String, required: true, select: false })
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
