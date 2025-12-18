import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    // Agar array bo'lsa
    if (Array.isArray(value))
      return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    // Agar string bo'lsa — JSON array, comma-separated yoki single
    if (typeof value === 'string') {
      const s = value.trim();
      // JSON array string: "[1,2]"
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const parsed: unknown = JSON.parse(s);
          if (Array.isArray(parsed)) {
            return (parsed as unknown[])
              .filter((v) => typeof v === 'string' || typeof v === 'number')
              .map((v) => Number(v))
              .filter((n) => !Number.isNaN(n));
          }
        } catch (e) {
          console.error(e);
        }
      }
      // comma separated: "1,2"
      if (s.includes(','))
        return s
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => !Number.isNaN(n));
      // single value
      const num = Number(s);
      return Number.isNaN(num) ? undefined : [num];
    }
    // fallback
    return undefined;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  bedrooms?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value))
      return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (typeof value === 'string') {
      const s = value.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const parsed: unknown = JSON.parse(s);
          if (Array.isArray(parsed)) {
            return (parsed as unknown[])
              .filter((v) => typeof v === 'string' || typeof v === 'number')
              .map((v) => Number(v))
              .filter((n) => !Number.isNaN(n));
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (s.includes(','))
        return s
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => !Number.isNaN(n));
      const num = Number(s);
      return Number.isNaN(num) ? undefined : [num];
    }
    return undefined;
  })
  @IsArray()
  @IsNumber({}, { each: true })
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
  @IsEnum(EnumPropertyCategory)
  category?: EnumPropertyCategory;

  @IsOptional()
  @IsEnum(EnumPropertyCategoryFilter)
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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sw_lng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sw_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ne_lng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ne_lat?: number;
}
