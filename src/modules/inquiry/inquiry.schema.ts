import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InquiryDocument = Inquiry & Document;

export enum EnumInquiryType {
  PURCHASE = 'purchase', // Sotib olish
  RENT = 'rent', // Ijaraga olish
  MORTGAGE = 'mortgage', // Ipoteka orqali olish
}

/**
 * Inquiry Status — seller tomonidan qayta ishlash jarayoni
 */
export enum EnumInquiryStatus {
  PENDING = 'pending', // Yuborilgan, hali ko'rilmagan
  VIEWED = 'viewed', // Ko'rib chiqilgan
  RESPONDED = 'responded', // Javob berilgan
  ACCEPTED = 'accepted', // Seller tomonidan qabul qilingan
  REJECTED = 'rejected', // Rad etilgan
  CANCELED = 'canceled', // Foydalanuvchi bekor qilgan
}

/**
 * 🗓️ RentalPeriod — ijara muddati (Propertydagi Location kabi alohida sub-schema)
 */
@Schema({ _id: false })
export class RentalPeriod {
  @Prop({ type: Date, required: true })
  from: Date;

  @Prop({ type: Date, required: true })
  to: Date;
}

export const RentalPeriodSchema = SchemaFactory.createForClass(RentalPeriod);

/**
 * 🏠 Inquiry — foydalanuvchi tomonidan yuborilgan so‘rov (Property uchun)
 */
@Schema({ timestamps: true })
export class Inquiry {
  // 👤 Kim yuborgan
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  // 🏡 Qaysi property uchun
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;

  // 🔖 Inquiry turi
  @Prop({
    type: String,
    enum: EnumInquiryType,
    required: true,
  })
  type: EnumInquiryType;

  // 💵 Taklif qilingan narx
  @Prop({ type: Number, required: false, min: 0 })
  offered_price?: number;

  // 📅 Ijara muddati (agar type == rent)
  @Prop({ type: RentalPeriodSchema, required: false })
  rental_period?: RentalPeriod;

  // 🗒️ Qo‘shimcha izoh
  @Prop({ type: String, required: false, maxlength: 1000 })
  comment?: string;

  // 🔄 Inquiry holati
  @Prop({
    type: String,
    enum: EnumInquiryStatus,
    default: EnumInquiryStatus.PENDING,
  })
  status: EnumInquiryStatus;
}

export const InquirySchema = SchemaFactory.createForClass(Inquiry);
