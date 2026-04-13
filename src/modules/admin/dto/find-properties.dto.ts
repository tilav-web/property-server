import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { EnumPropertyStatus } from 'src/modules/property/enums/property-status.enum';
import { EnumPropertyCategory } from 'src/modules/property/enums/property-category.enum';
import { Type, Transform } from 'class-transformer';

export class FindPropertiesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(Object.values(EnumPropertyStatus))
  status?: EnumPropertyStatus;

  @IsOptional()
  @IsIn(Object.values(EnumPropertyCategory))
  category?: EnumPropertyCategory;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  is_archived?: boolean;
}
