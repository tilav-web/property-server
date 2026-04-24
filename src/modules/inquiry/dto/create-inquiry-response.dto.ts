import { IsString, IsEnum, IsMongoId, MaxLength } from 'class-validator';
import { EnumInquiryResponseStatus } from '../schemas/inquiry-response.schema';

export class CreateInquiryResponseDto {
  @IsEnum(EnumInquiryResponseStatus)
  status: EnumInquiryResponseStatus;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsMongoId()
  inquiryId: string;
}
