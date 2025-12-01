import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Language {
  @Prop({ type: String, required: true })
  uz: string;
  @Prop({ type: String, required: true })
  ru: string;
  @Prop({ type: String, required: true })
  en: string;
}
