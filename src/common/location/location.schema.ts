import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type: string;
  @Prop({ type: [Number, Number], required: true })
  coordinates: [number, number];
}
