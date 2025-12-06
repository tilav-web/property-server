import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../../enums/repair-type.enum';
import { EnumHeating } from '../../enums/heating.enum';
import { EnumRentalTarget } from '../../enums/rental-target.enum';

export type ApartmentRentDocument = Document & ApartmentRent;

@Schema()
export class ApartmentRent {
  // 🛏️ Xonalar soni
  @Prop({ type: Number, min: 0, required: true })
  bedrooms: number;

  // 🛁 Hammomlar soni
  @Prop({ type: Number, min: 0, required: true })
  bathrooms: number;

  // 🏢 Qaysi qavatda joylashgan
  @Prop({ type: Number, min: 0, required: true })
  floor_level: number;

  // 🏢 Binodagi umumiy qavatlar soni
  @Prop({ type: Number, min: 0, required: true })
  total_floors: number;

  // 📏 Kvadrat metr, maydon
  @Prop({ type: Number, min: 0, required: true })
  area: number;

  // 🌇 Balkon borligi (true/false)
  @Prop({ default: false })
  balcony: boolean;

  // 🛋️ Mevzu jihozlanganmi (true/false)
  @Prop({ default: false })
  furnished: boolean;

  // 🛠️ Ta'mir turi: yangi / ta'mirlangan / eski
  @Prop({
    type: String,
    enum: EnumRepairType,
    default: EnumRepairType.NEW,
  })
  repair_type: EnumRepairType;

  // ♨️ Qanday isitish: markaziy / individual / yo'q
  @Prop({
    type: String,
    enum: EnumHeating,
    default: EnumHeating.CENTRAL,
  })
  heating: EnumHeating;

  // ❄️ Konditsioner borligi
  @Prop({ default: false })
  air_conditioning: boolean;

  // 🚗 Parking mavjudligi
  @Prop({ default: false })
  parking: boolean;

  // 🛗 Lift mavjudligi
  @Prop({ default: false })
  elevator: boolean;

  // 🏊‍♂️ Qo'shimcha qulayliklar
  @Prop({ type: [String], enum: EnumAmenities, default: [] })
  amenities: EnumAmenities[];

  // 📅 Kontrakt muddati (oylar)
  @Prop({ type: Number, default: 12 })
  contract_duration_months: number;

  @Prop({
    type: [String],
    enum: EnumRentalTarget,
    default: [EnumRentalTarget.ANY],
  })
  rental_target: EnumRentalTarget[];
}

export const ApartmentRentSchema = SchemaFactory.createForClass(ApartmentRent);
