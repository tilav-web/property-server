import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EnumLandType } from '../../enums/land-type.enum';
import { PropertyDocument } from '../property.schema';

export type LandSaleDocument = PropertyDocument & LandSale;

@Schema()
export class LandSale {
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

  @Prop({ default: false })
  mortgage_available: boolean;
}

export const LandSaleSchema = SchemaFactory.createForClass(LandSale);
