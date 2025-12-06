import {
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';
import { Language } from 'src/common/language/language.schema';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';

export class UpdatePropertyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Language)
  title?: Language;

  @IsOptional()
  @ValidateNested()
  @Type(() => Language)
  description?: Language;

  @IsOptional()
  @ValidateNested()
  @Type(() => Language)
  address?: Language;

  @IsOptional()
  @IsNumber()
  location_lat?: number;

  @IsOptional()
  @IsNumber()
  location_lng?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsEnum(EnumPropertyCurrency)
  currency?: EnumPropertyCurrency;

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  floor_level?: number;

  @IsOptional()
  @IsNumber()
  total_floors?: number;

  @IsOptional()
  @IsNumber()
  area?: number;

  @IsOptional()
  @IsBoolean()
  balcony?: boolean;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsEnum(EnumRepairType)
  repair_type?: EnumRepairType;

  @IsOptional()
  @IsEnum(EnumHeating)
  heating?: EnumHeating;

  @IsOptional()
  @IsBoolean()
  air_conditioning?: boolean;

  @IsOptional()
  @IsBoolean()
  parking?: boolean;

  @IsOptional()
  @IsBoolean()
  elevator?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  amenities?: EnumAmenities[];

  // Ijara uchun maydon
  @IsOptional()
  @IsNumber()
  contract_duration_months?: number;

  // Sotuv uchun maydon
  @IsOptional()
  @IsBoolean()
  mortgage_available?: boolean;
}
