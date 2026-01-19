import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';

const valueToBoolean = (value: any) => {
  console.log(value);

  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (['true', 'on', 'yes', '1'].includes(String(value).toLowerCase())) {
    return true;
  }
  if (['false', 'off', 'no', '0'].includes(String(value).toLowerCase())) {
    return false;
  }
  return undefined;
};

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
  @Transform(({ value }) => Number(value))
  @IsOptional()
  location_lat?: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
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
  @Transform(({ value }) => Number(value))
  price?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
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
  @Transform(({ value }) => Number(value))
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  floor_level?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  total_floors?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  area?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  balcony?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  furnished?: boolean;

  @IsOptional()
  @IsEnum(EnumRepairType)
  repair_type?: EnumRepairType;

  @IsOptional()
  @IsEnum(EnumHeating)
  heating?: EnumHeating;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  air_conditioning?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  parking?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  elevator?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // Apartment Rent specific
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  contract_duration_months?: number;

  // Apartment Sale specific
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  mortgage_available?: boolean;
}
