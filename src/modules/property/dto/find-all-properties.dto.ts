import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';

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
  search?: string;

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
