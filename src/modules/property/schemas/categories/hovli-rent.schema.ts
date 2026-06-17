import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../../enums/repair-type.enum';
import { EnumHeating } from '../../enums/heating.enum';
import { EnumRentalTarget } from '../../enums/rental-target.enum';
import { PropertyDocument } from '../property.schema';

export type HovliRentDocument = PropertyDocument & HovliRent;

@Schema()
export class HovliRent {
  @Prop({ type: Number, min: 0 })
  rooms: number;

  @Prop({ type: Number, min: 0 })
  area: number;

  @Prop({ type: Number, min: 0 })
  land_area: number;

  @Prop({ type: Number, min: 0 })
  floors: number;

  @Prop({ type: String, enum: EnumRepairType, default: EnumRepairType.NEW })
  repair_type: EnumRepairType;

  @Prop({ default: false })
  furnished: boolean;

  @Prop({ type: String, enum: EnumHeating, default: EnumHeating.CENTRAL })
  heating: EnumHeating;

  @Prop({ type: [String], enum: EnumAmenities, default: [] })
  amenities: EnumAmenities[];

  @Prop({ type: Number, default: 12 })
  contract_duration_months: number;

  @Prop({
    type: [String],
    enum: EnumRentalTarget,
    default: [EnumRentalTarget.ANY],
  })
  rental_target: EnumRentalTarget[];
}

export const HovliRentSchema = SchemaFactory.createForClass(HovliRent);
