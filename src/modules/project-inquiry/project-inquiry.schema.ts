import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectInquiryDocument = ProjectInquiry & Document;

export enum EnumContactMethod {
  CHAT = 'chat',
  EMAIL = 'email',
  PHONE = 'phone',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
}

export enum EnumProjectInquiryStatus {
  NEW = 'new',
  SEEN = 'seen',
  CONTACTED = 'contacted',
  CLOSED = 'closed',
}

@Schema({ timestamps: true, collection: 'project_inquiries' })
export class ProjectInquiry {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  project: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ type: String, required: true })
  full_name: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({
    type: String,
    enum: EnumContactMethod,
    required: true,
  })
  contact_method: EnumContactMethod;

  @Prop({ type: String, required: false, maxlength: 1000 })
  message?: string;

  @Prop({
    type: String,
    enum: EnumProjectInquiryStatus,
    default: EnumProjectInquiryStatus.NEW,
    index: true,
  })
  status: EnumProjectInquiryStatus;
}

export const ProjectInquirySchema =
  SchemaFactory.createForClass(ProjectInquiry);
ProjectInquirySchema.index({ status: 1, createdAt: -1 });
