import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InquiryResponseDocument = InquiryResponse & Document;

export enum EnumInquiryResponseStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class InquiryResponse {
  @Prop({
    type: String,
    enum: EnumInquiryResponseStatus,
    required: true,
  })
  status: EnumInquiryResponseStatus;

  @Prop({ type: String, required: true, maxlength: 1000 })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Inquiry', required: true })
  inquiry: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;
}

export const InquiryResponseSchema =
  SchemaFactory.createForClass(InquiryResponse);
