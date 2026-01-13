import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';

export class UpdatePropertyDto {
  @IsString()
  @IsOptional()
  title_uz?: string;

  @IsString()
  @IsOptional()
  title_ru?: string;

  @IsString()
  @IsOptional()
  title_en?: string;

  @IsString()
  @IsOptional()
  description_uz?: string;

  @IsString()
  @IsOptional()
  description_ru?: string;

  @IsString()
  @IsOptional()
  description_en?: string;

  @IsString()
  @IsOptional()
  address_uz?: string;

  @IsString()
  @IsOptional()
  address_ru?: string;

  @IsString()
  @IsOptional()
  address_en?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  location_lat?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  location_lng?: number;

  @IsOptional()
  @IsEnum(EnumPropertyCategory)
  category?: EnumPropertyCategory;

  @IsOptional()
  @IsEnum(EnumPropertyCurrency)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_archived?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos_to_delete?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos_to_delete?: string[];

  // Fields for Apartment Rent/Sale
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floor_level?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  total_floors?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  area?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  balcony?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  furnished?: boolean;

  @IsOptional()
  @IsEnum(EnumRepairType)
  repair_type?: EnumRepairType;

  @IsOptional()
  @IsEnum(EnumHeating)
  heating?: EnumHeating;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  air_conditioning?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  parking?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  elevator?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // Apartment Rent specific
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  contract_duration_months?: number;

  // Apartment Sale specific
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  mortgage_available?: boolean;
}
