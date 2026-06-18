import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateIf,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { CurrencyCode } from 'src/common/currencies';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';
import { EnumLandType } from '../enums/land-type.enum';

const valueToBoolean = (value: any) => {
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
  @Min(-90, { message: "Latitude noto'g'ri!" })
  @Max(90, { message: "Latitude noto'g'ri!" })
  location_lat?: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @Min(-180, { message: "Longitude noto'g'ri!" })
  @Max(180, { message: "Longitude noto'g'ri!" })
  location_lng?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumPropertyCategory)
  category?: EnumPropertyCategory;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) =>
    value === ''
      ? undefined
      : typeof value === 'string'
        ? value.toUpperCase()
        : value,
  )
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Narx manfiy bo'lishi mumkin emas!" })
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
  furnished?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumRepairType)
  repair_type?: EnumRepairType;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumHeating)
  heating?: EnumHeating;

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

  // Hovli specific
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  rooms?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  land_area?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  floors?: number;

  // Land specific
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumLandType)
  land_type?: EnumLandType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  is_electricity?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  is_water?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  is_gas?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  road_access?: boolean;

  // Garage specific
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  has_pit?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  has_electricity?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => valueToBoolean(value))
  is_heated?: boolean;
}
