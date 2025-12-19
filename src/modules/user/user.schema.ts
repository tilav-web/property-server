import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EnumAuthProvider } from 'src/enums/auth-provider.enum';
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

@Schema({ _id: false })
export class SocialAccount {
  @Prop({ type: String, required: true })
  provider: EnumAuthProvider;

  @Prop({ type: String, required: true })
  providerId: string;

  @Prop({ type: Boolean, default: true })
  isVerified: boolean;
}

export const SocialAccountSchema = SchemaFactory.createForClass(SocialAccount);

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

  @Prop({
    type: String,
    enum: EnumAuthProvider,
    default: EnumAuthProvider.LOCAL,
  })
  provider: EnumAuthProvider;

  @Prop({
    type: [SocialAccountSchema],
    default: [],
  })
  socialAccounts: SocialAccount[];

  @Prop({ type: String, default: null })
  avatar: string;

  @Prop({ type: String, required: true, default: EnumRole.PHYSICAL })
  role: EnumRole;

  @Prop({ type: String, required: true, default: EnumLanguage.UZ })
  lan: EnumLanguage;

  @Prop({
    type: String,
    select: false,
    default: null,
  })
  password?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
