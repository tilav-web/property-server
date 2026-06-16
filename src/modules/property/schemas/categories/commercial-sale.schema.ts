import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../../enums/repair-type.enum';
import { EnumHeating } from '../../enums/heating.enum';
import { PropertyDocument } from '../property.schema';

export type CommercialSaleDocument = PropertyDocument & CommercialSale;

@Schema()
export class CommercialSale {
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

  @Prop({ default: false })
  mortgage_available: boolean;
}

export const CommercialSaleSchema =
  SchemaFactory.createForClass(CommercialSale);
