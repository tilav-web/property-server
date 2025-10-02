import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum FileType {
  AVATAR = 'User',
  PROPERTY = 'Property',
}

export type FileDocument = Document & File;
@Schema({ timestamps: true })
export class File {
  @Prop({ type: Types.ObjectId, required: true })
  document_id: string;

  @Prop({
    type: String,
    required: true,
    enum: FileType,
  })
  document_type: string;

  @Prop({ type: String, required: true })
  file_name: string;

  @Prop({ type: String, required: true })
  file_path: string;

  @Prop({ type: String, required: true })
  mime_type: string;

  @Prop({ type: Number, required: true })
  file_size: number;

  @Prop({ type: String })
  original_name: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const FileSchema = SchemaFactory.createForClass(File);
