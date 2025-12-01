import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { EnumPropertyPurpose } from 'src/enums/property-purpose.enum';
import { EnumPropertyPriceType } from 'src/enums/property-price-type.enum';
import { EnumConstructionStatus } from 'src/enums/property-construction-status.enum';

export class FindAllPropertiesDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  coordinates?: [number, number];

  @IsOptional()
  @IsString()
  category?: EnumPropertyCategory;

  @IsOptional()
  @IsString()
  purpose?: EnumPropertyPurpose;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  price_type?: EnumPropertyPriceType;

  @IsOptional()
  @IsString()
  construction_status?: EnumConstructionStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_premium?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_verified?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_new?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_guest_choice?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number; // in kilometers

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sample?: boolean;
}
