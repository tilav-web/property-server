import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type TagDocument = Document & Tag;

@Schema()
export class Tag {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  search: string;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
