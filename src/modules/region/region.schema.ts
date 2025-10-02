import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from '../property/property.schema';

export type RegionDocument = Document & Region;

@Schema({ timestamps: true })
export class Region {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: Location, required: true })
  location: Location;
}

export const RegionSchema = SchemaFactory.createForClass(Region);
