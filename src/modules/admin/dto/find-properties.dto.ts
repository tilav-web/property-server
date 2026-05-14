import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnumPropertyStatus } from 'src/modules/property/enums/property-status.enum';
import { EnumPropertyCategory } from 'src/modules/property/enums/property-category.enum';
import { Type, Transform } from 'class-transformer';

export class FindPropertiesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'mont kiara' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: EnumPropertyStatus,
    enumName: 'EnumPropertyStatus',
    example: EnumPropertyStatus.APPROVED,
  })
  @IsOptional()
  @IsIn(Object.values(EnumPropertyStatus))
  status?: EnumPropertyStatus;

  @ApiPropertyOptional({
    enum: EnumPropertyCategory,
    enumName: 'EnumPropertyCategory',
    example: EnumPropertyCategory.APARTMENT_SALE,
  })
  @IsOptional()
  @IsIn(Object.values(EnumPropertyCategory))
  category?: EnumPropertyCategory;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  is_archived?: boolean;
}
