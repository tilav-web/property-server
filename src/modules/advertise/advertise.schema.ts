import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

export type AdvertiseDocument = Document & Advertise;

@Schema({ timestamps: true })
export class Advertise {
  @Prop({ type: String, required: true })
  target: string;

  @Prop({
    type: String,
    required: true,
    default: EnumAdvertiseType.BANNER,
    enum: EnumAdvertiseType,
  })
  type: EnumAdvertiseType;

  @Prop({ type: Types.ObjectId, ref: 'File', required: true })
  image: string;
}

export const AdvertiseSchema = SchemaFactory.createForClass(Advertise);
