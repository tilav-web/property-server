import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';

class LocationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  coordinates: [number, number];
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  @Min(10)
  @Max(40)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Min(40)
  @Max(140)
  description: string;

  @IsEnum(EnumPropertyCategory)
  @IsNotEmpty()
  category: EnumPropertyCategory;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsString()
  @IsNotEmpty()
  @Min(20)
  address: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsEnum(EnumPropertyPriceType)
  @IsNotEmpty()
  price_type: EnumPropertyPriceType;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  area: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bedrooms?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bathrooms?: number;

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

  @IsNumber()
  @IsOptional()
  @Min(1900)
  year_built?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  parking_spaces?: number;

  @IsBoolean()
  @IsOptional()
  is_premium?: boolean;

  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;

  @IsBoolean()
  @IsOptional()
  is_new?: boolean;

  @IsBoolean()
  @IsOptional()
  is_guest_choice?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  reviews_count?: number;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsOptional()
  delivery_date?: Date;

  @IsOptional()
  sales_date?: Date;

  @IsNumber()
  @IsOptional()
  @Min(0)
  payment_plans?: number;
}
