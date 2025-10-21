import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsMongoId,
  IsArray,
  ValidateNested,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { Types } from 'mongoose';
import { EnumPropertyPurpose } from 'src/enums/property-purpose.enum';

class LanguageDto {
  @IsString()
  @IsNotEmpty()
  uz: string;

  @IsString()
  @IsNotEmpty()
  ru: string;

  @IsString()
  @IsNotEmpty()
  en: string;
}

export class CreatePropertyDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LanguageDto)
  @IsNotEmpty()
  title: LanguageDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LanguageDto)
  @IsNotEmpty()
  description: LanguageDto;

  @IsEnum(EnumPropertyCategory)
  @IsNotEmpty()
  category: EnumPropertyCategory;

  @IsOptional()
  @IsString()
  location: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LanguageDto)
  @IsNotEmpty()
  address: LanguageDto;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsEnum(EnumPropertyPriceType)
  @IsNotEmpty()
  price_type: EnumPropertyPriceType;

  @IsEnum(EnumPropertyPurpose)
  @IsNotEmpty()
  purpose: EnumPropertyPurpose;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  area: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  bedrooms?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  bathrooms?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  floor_level?: number;

  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  @IsOptional()
  amenities?: EnumAmenities[];

  @IsEnum(EnumConstructionStatus)
  @IsOptional()
  construction_status?: EnumConstructionStatus;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1900)
  year_built?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  parking_spaces?: number;

  @Type(() => Boolean)
  @IsOptional()
  is_premium?: boolean;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsString()
  @IsOptional()
  logo?: string;

  @Type(() => Date)
  @IsOptional()
  delivery_date?: Date;

  @Type(() => Date)
  @IsOptional()
  sales_date?: Date;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  payment_plans?: number;

  @Type(() => Types.ObjectId)
  @IsMongoId()
  @IsNotEmpty()
  region: Types.ObjectId;

  @Type(() => Types.ObjectId)
  @IsMongoId()
  @IsNotEmpty()
  district: Types.ObjectId;
}
