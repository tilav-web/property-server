import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ToBoolean } from 'src/common/transforms/boolean.transform';

/**
 * FormData orqali "filters" csv (id1,id2,...) yoki array bo'lib kelishi mumkin.
 * Avtomatik trim + array konversiya.
 */
function transformFilters(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export class CreateCommunityDto {
  @ApiProperty({ example: 'Qarshi markaz' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Qashqadaryo' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ example: 4.6 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'NEW' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  badge?: string;

  @ApiPropertyOptional({ example: '/filter-nav?category=APARTMENT_SALE' })
  @IsString()
  @IsOptional()
  searchHref?: string;

  @ApiPropertyOptional({
    description: 'Tegishli filter ID lar (csv yoki array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => transformFilters(value))
  @IsArray()
  @IsMongoId({ each: true })
  filters?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
