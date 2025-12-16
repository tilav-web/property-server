import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { EnumPropertyCategoryFilter } from '../enums/property-category-filter.enum';
import { EnumPropertyStatus } from '../enums/property-status.enum';

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
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  bedrooms?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  bathrooms?: number[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @IsString()
  category?: EnumPropertyCategory;

  @IsOptional()
  @IsString()
  filterCategory?: EnumPropertyCategoryFilter;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_premium?: boolean;

  @IsOptional()
  @IsEnum(EnumPropertyStatus)
  status?: EnumPropertyStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_archived?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_new?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sample?: boolean;
}
