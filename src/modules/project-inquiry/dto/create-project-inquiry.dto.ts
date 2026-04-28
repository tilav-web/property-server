import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EnumContactMethod } from '../project-inquiry.schema';

export class CreateProjectInquiryDto {
  @IsMongoId()
  project: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEnum(EnumContactMethod)
  contact_method: EnumContactMethod;

  // email majburiy bo'ladi agar contact_method=email
  @ValidateIf((o: CreateProjectInquiryDto) => o.contact_method === 'email')
  @IsString()
  @IsNotEmpty({ message: 'Email majburiy' })
  email?: string;

  // telefon majburiy bo'ladi phone/whatsapp/telegram uchun
  @ValidateIf((o: CreateProjectInquiryDto) =>
    ['phone', 'whatsapp', 'telegram'].includes(o.contact_method),
  )
  @IsString()
  @IsNotEmpty({ message: 'Telefon majburiy' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
