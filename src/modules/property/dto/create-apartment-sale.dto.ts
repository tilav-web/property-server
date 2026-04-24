import {
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { CreatePropertyBaseDto } from './create-property.dto';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';
import { Type } from 'class-transformer';

export class CreateApartmentSaleDto extends CreatePropertyBaseDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floor_level?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  total_floors?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  area?: number;

  @IsBoolean() @IsOptional() furnished?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumRepairType)
  repair_type?: EnumRepairType;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumHeating)
  heating?: EnumHeating;

  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  @IsOptional()
  amenities?: EnumAmenities[];

  @IsBoolean()
  @IsOptional()
  mortgage_available?: boolean;
}
