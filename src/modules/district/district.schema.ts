import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from '../property/property.schema';

export type DistrictDocument = Document & District;

@Schema({ timestamps: true })
export class District {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  region_code: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: Location, required: true })
  location: Location;
}

export const DistrictSchema = SchemaFactory.createForClass(District);
