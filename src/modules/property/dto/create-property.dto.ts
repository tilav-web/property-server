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
  Length,
  IsMongoId,
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
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  coordinates: [number, number];
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 40)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(40, 140)
  description: string;

  @IsEnum(EnumPropertyCategory)
  @IsNotEmpty()
  category: EnumPropertyCategory;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsString()
  @IsNotEmpty()
  @Length(20)
  address: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsEnum(EnumPropertyPriceType)
  @IsNotEmpty()
  price_type: EnumPropertyPriceType;

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
  @IsBoolean()
  @IsOptional()
  is_premium?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_new?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_guest_choice?: boolean;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  reviews_count?: number;

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

  @IsMongoId()
  @IsNotEmpty()
  region: string;

  @IsMongoId()
  @IsNotEmpty()
  district: string;
}
