import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EnumLanguage } from 'src/enums/language.enum';
import { EnumRole } from 'src/enums/role.enum';

export type UserDocument = Document & User;

@Schema({ _id: false })
export class Identifier {
  @Prop({ type: String, sparse: true, default: null })
  value: string;
  @Prop({ type: Boolean, default: false })
  isVerified: boolean;
}

export const IdentifierSchema = SchemaFactory.createForClass(Identifier);

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, default: null })
  first_name: string;

  @Prop({ type: String, default: null })
  last_name: string;

  @Prop({ type: IdentifierSchema, default: { value: null, isVerified: false } })
  phone: Identifier;

  @Prop({ type: IdentifierSchema, required: true })
  email: Identifier;

  @Prop({ type: String, default: null })
  avatar: string;

  @Prop({ type: String, required: true, default: EnumRole.PHYSICAL })
  role: EnumRole;

  @Prop({ type: String, required: true, default: EnumLanguage.UZ })
  lan: EnumLanguage;

  @Prop({ type: String, required: true, select: false })
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
