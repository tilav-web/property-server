import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PropertyDocument } from '../property.schema';

export type GarageSaleDocument = PropertyDocument & GarageSale;

@Schema()
export class GarageSale {
  @Prop({ type: Number, min: 0 })
  area: number;

  @Prop({ default: false })
  has_pit: boolean;

  @Prop({ default: false })
  has_electricity: boolean;

  @Prop({ default: false })
  is_heated: boolean;

  @Prop({ default: false })
  mortgage_available: boolean;
}

export const GarageSaleSchema = SchemaFactory.createForClass(GarageSale);
