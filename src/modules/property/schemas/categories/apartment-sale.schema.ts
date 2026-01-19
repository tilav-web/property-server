import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../../enums/repair-type.enum';
import { EnumHeating } from '../../enums/heating.enum';
import { PropertyDocument } from '../property.schema';

export type ApartmentSaleDocument = PropertyDocument & ApartmentSale;

@Schema()
export class ApartmentSale {
  // 🛏️ Xonalar soni
  @Prop({ type: Number, min: 0 })
  bedrooms: number;

  // 🛁 Hammomlar soni
  @Prop({ type: Number, min: 0 })
  bathrooms: number;

  // 🏢 Qaysi qavatda joylashgan
  @Prop({ type: Number, min: 0 })
  floor_level: number;

  // 🏢 Binodagi umumiy qavatlar soni
  @Prop({ type: Number, min: 0 })
  total_floors: number;

  // 📏 Kvadrat metr, maydon
  @Prop({ type: Number, min: 0 })
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

  // 🏦 Ipoteka orqali sotish mumkinmi
  @Prop({ default: false })
  mortgage_available: boolean;
}

export const ApartmentSaleSchema = SchemaFactory.createForClass(ApartmentSale);
