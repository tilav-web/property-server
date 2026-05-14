import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EnumProjectInquiryStatus } from '../project-inquiry.schema';

export class UpdateProjectInquiryStatusDto {
  @ApiProperty({ enum: EnumProjectInquiryStatus })
  @IsEnum(EnumProjectInquiryStatus)
  status: EnumProjectInquiryStatus;
}
