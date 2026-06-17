import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PropertyDocument } from '../property.schema';

export type GarageRentDocument = PropertyDocument & GarageRent;

@Schema()
export class GarageRent {
  @Prop({ type: Number, min: 0 })
  area: number;

  @Prop({ default: false })
  has_pit: boolean;

  @Prop({ default: false })
  has_electricity: boolean;

  @Prop({ default: false })
  is_heated: boolean;
}

export const GarageRentSchema = SchemaFactory.createForClass(GarageRent);
