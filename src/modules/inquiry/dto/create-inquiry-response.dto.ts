import { IsString, IsEnum, IsMongoId } from 'class-validator';
import { EnumInquiryResponseStatus } from '../schemas/inquiry-response.schema';
import { Types } from 'mongoose';

export class CreateInquiryResponseDto {
  @IsEnum(EnumInquiryResponseStatus)
  status: EnumInquiryResponseStatus;

  @IsString()
  description: string;

  @IsMongoId()
  user: Types.ObjectId;

  @IsMongoId()
  inquiry: Types.ObjectId;

  @IsMongoId()
  property: Types.ObjectId;
}
