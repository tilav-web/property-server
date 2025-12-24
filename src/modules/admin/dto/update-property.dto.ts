import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyStatus } from 'src/modules/property/enums/property-status.enum';
import { EnumPropertyCategory } from 'src/modules/property/enums/property-category.enum';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';
import { LanguageDto } from 'src/common/language/language.dto';
import { LocationDto } from 'src/common/location/location.dto';

export class UpdatePropertyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageDto)
  title?: LanguageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageDto)
  description?: LanguageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageDto)
  address?: LanguageDto;

  @IsOptional()
  @IsIn(Object.values(EnumPropertyCategory))
  category?: EnumPropertyCategory;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsIn(Object.values(EnumPropertyCurrency))
  currency?: EnumPropertyCurrency;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_premium?: boolean;

  @IsOptional()
  @IsIn(Object.values(EnumPropertyStatus))
  status?: EnumPropertyStatus;

  @IsOptional()
  @IsBoolean()
  is_archived?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];
}
