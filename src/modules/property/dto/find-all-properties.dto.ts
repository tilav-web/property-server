import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateIf,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform as ClassTransformerTransform } from 'class-transformer';
import { Type, Transform } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { EnumPropertyCategoryFilter } from '../enums/property-category-filter.enum';
import { EnumPropertyStatus } from '../enums/property-status.enum';
import { SortOption } from '../enums/sort-option.enum';
import { CurrencyCode } from 'src/common/currencies';

export class FindAllPropertiesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Bedroom filter. Swagger yoki query uchun misollar: bedrooms=1,2 yoki [1,2]',
    example: [1, 2],
  })
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

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Bathroom filter. Swagger yoki query uchun misollar: bathrooms=1,2 yoki [1,2]',
    example: [1, 2],
  })
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

  @ApiPropertyOptional({ example: 101.6869 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ example: 3.139 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({
    enum: EnumPropertyCategory,
    enumName: 'EnumPropertyCategory',
    description: 'Allowed property categories',
    example: EnumPropertyCategory.APARTMENT_SALE,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @ClassTransformerTransform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumPropertyCategory)
  category?: EnumPropertyCategory;

  @ApiPropertyOptional({
    enum: EnumPropertyCategoryFilter,
    enumName: 'EnumPropertyCategoryFilter',
    description: 'Category filter tab/type',
    example: EnumPropertyCategoryFilter.APARTMENT,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @ClassTransformerTransform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumPropertyCategoryFilter)
  filterCategory?: EnumPropertyCategoryFilter;

  @ApiPropertyOptional({
    example: 'Mont Kiara condo',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Location tag (e.g. "Selangor", "Yunusobod"). Tag matching joins ' +
      'the free-text search across title/description/address.',
    example: 'Selangor',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({
    enum: CurrencyCode,
    enumName: 'CurrencyCode',
    description:
      'Currency context for price filtering/sorting. Use ISO code like MYR, USD, UZS.',
    example: CurrencyCode.MYR,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @ClassTransformerTransform(({ value }) =>
    value === ''
      ? undefined
      : typeof value === 'string'
        ? value.toUpperCase()
        : value,
  )
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiPropertyOptional({
    enum: SortOption,
    enumName: 'SortOption',
    example: SortOption.PRICE_ASC,
  })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_premium?: boolean;

  @ApiPropertyOptional({
    enum: EnumPropertyStatus,
    enumName: 'EnumPropertyStatus',
    example: EnumPropertyStatus.APPROVED,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @ClassTransformerTransform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumPropertyStatus)
  status?: EnumPropertyStatus;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_archived?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_new?: boolean;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ example: 15, description: 'Radius in kilometers' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ example: 900000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minArea?: number;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxArea?: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Amenity filter. Swagger yoki query uchun misollar: amenities=balcony,parking yoki ["balcony","parking"]',
    example: ['balcony', 'parking'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value.map((v: unknown) => String(v));
    if (typeof value === 'string') {
      const s = value.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const parsed: unknown = JSON.parse(s);
          if (Array.isArray(parsed))
            return (parsed as unknown[]).map((v) => String(v));
        } catch (e) {
          console.error(e);
        }
      }
      if (s.includes(',')) return s.split(',').map((v) => v.trim());
      return [s];
    }
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  furnished?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Return sample data block instead of paginated list when true',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sample?: boolean;

  @ApiPropertyOptional({ example: 101.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sw_lng?: number;

  @ApiPropertyOptional({ example: 2.9 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sw_lat?: number;

  @ApiPropertyOptional({ example: 102.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ne_lng?: number;

  @ApiPropertyOptional({ example: 3.4 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ne_lat?: number;
}
