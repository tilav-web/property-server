import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Length,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyCategory } from 'src/enums/property-category.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { Types } from 'mongoose';

// class LocationDto {
//   @IsString()
//   @IsNotEmpty()
//   type: string;

//   @Min(-180, { each: true })
//   @Max(180, { each: true })
//   coordinates: [number, number];
// }

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

  @IsOptional()
  @IsString()
  location: string;

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

  @IsOptional()
  @IsString()
  amenities?: string;

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

  @IsString()
  @IsOptional()
  logo?: string;

  @Type(() => Date)
  @IsOptional()
  delivery_date?: Date;

  @Type(() => Date)
  @IsOptional()
  sales_date?: Date;

  @Type(() => Types.ObjectId)
  @IsMongoId()
  @IsNotEmpty()
  region: string;

  @Type(() => Types.ObjectId)
  @IsMongoId()
  @IsNotEmpty()
  district: string;
}
