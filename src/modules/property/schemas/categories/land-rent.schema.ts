import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EnumLandType } from '../../enums/land-type.enum';
import { PropertyDocument } from '../property.schema';

export type LandRentDocument = PropertyDocument & LandRent;

@Schema()
export class LandRent {
  @Prop({ type: Number, min: 0 })
  area: number;

  @Prop({ type: String, enum: EnumLandType, default: EnumLandType.RESIDENTIAL })
  land_type: EnumLandType;

  @Prop({ default: false })
  is_electricity: boolean;

  @Prop({ default: false })
  is_water: boolean;

  @Prop({ default: false })
  is_gas: boolean;

  @Prop({ default: false })
  road_access: boolean;
}

export const LandRentSchema = SchemaFactory.createForClass(LandRent);
