import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../../enums/repair-type.enum';
import { EnumHeating } from '../../enums/heating.enum';
import { PropertyDocument } from '../property.schema';

export type CommercialRentDocument = PropertyDocument & CommercialRent;

@Schema()
export class CommercialRent {
  @Prop({ type: Number, min: 0 })
  floor_level: number;

  @Prop({ type: Number, min: 0 })
  total_floors: number;

  @Prop({ type: Number, min: 0 })
  area: number;

  @Prop({ default: false })
  furnished: boolean;

  @Prop({ type: String, enum: EnumRepairType, default: EnumRepairType.NEW })
  repair_type: EnumRepairType;

  @Prop({ type: String, enum: EnumHeating, default: EnumHeating.CENTRAL })
  heating: EnumHeating;

  @Prop({ type: [String], enum: EnumAmenities, default: [] })
  amenities: EnumAmenities[];

  @Prop({ type: Number, default: 12 })
  contract_duration_months: number;
}

export const CommercialRentSchema =
  SchemaFactory.createForClass(CommercialRent);
