import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumInquiryType } from '../inquiry.schema';
import { Types } from 'mongoose';

class RentalPeriodDto {
  @IsNotEmpty()
  from: Date;

  @IsNotEmpty()
  to: Date;
}

export class CreateInquiryDto {
  @IsMongoId()
  @IsNotEmpty()
  property: Types.ObjectId;

  @IsEnum(EnumInquiryType)
  @IsNotEmpty()
  type: EnumInquiryType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offered_price?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RentalPeriodDto)
  rental_period?: RentalPeriodDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
