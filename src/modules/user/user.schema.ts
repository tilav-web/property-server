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

  @Prop({ type: IdentifierSchema, default: { value: null, isVerified: false } })
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

  @Prop({ type: String, required: true, default: EnumLanguage.EN })
  lan: EnumLanguage;

  @Prop({
    type: String,
    select: false,
    default: null,
  })
  password?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isAI: boolean;

  /**
   * Umumiy "Premium" obuna amal qilish muddati. Quyidagilarni ochadi:
   *  - Voice AI cheksiz (bepul kunlik limit yo'q)
   *  - Property yaratish cheksiz (bepul limit yo'q)
   *  - Property "top"ga chiqarish (PROPERTY_PREMIUM) chegirma bilan
   *
   * Reklama (advertise) alohida — har bir reklama uchun to'lov.
   *
   * Backwards compat: oldingi voicePremiumUntil shu yerga ko'chiriladi
   * bootstrap'da (bir martalik migration).
   */
  @Prop({ type: Date, default: null })
  premiumUntil?: Date | null;

  /** @deprecated premiumUntil bilan birlashtirilgan. Migration uchun saqlangan. */
  @Prop({ type: Date, default: null })
  voicePremiumUntil?: Date | null;

  @Prop({ type: String, default: null })
  instagram?: string | null;

  @Prop({ type: String, default: null })
  telegram?: string | null;

  @Prop({ type: String, default: null })
  whatsapp?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Sparse unique indexes — null qiymatga ruxsat, lekin dublikat yo'q
UserSchema.index(
  { 'email.value': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'email.value': { $type: 'string' } },
  },
);
UserSchema.index(
  { 'phone.value': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'phone.value': { $type: 'string' } },
  },
);
