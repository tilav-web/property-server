import {
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { CreatePropertyBaseDto } from './create-property.dto';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';
import { Type } from 'class-transformer';

export class CreateApartmentRentDto extends CreatePropertyBaseDto {
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

  @IsBoolean() @IsOptional() balcony?: boolean;
  @IsBoolean() @IsOptional() furnished?: boolean;

  @IsEnum(EnumRepairType)
  repair_type?: EnumRepairType;

  @IsEnum(EnumHeating)
  heating?: EnumHeating;

  @IsBoolean() @IsOptional() air_conditioning?: boolean;
  @IsBoolean() @IsOptional() parking?: boolean;
  @IsBoolean() @IsOptional() elevator?: boolean;

  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  @IsOptional()
  amenities?: EnumAmenities[];

  // Ijara uchun qo‘shimcha maydonlar
  @IsNumber() monthly_rent?: number;
  @IsNumber() @IsOptional() contract_duration_months?: number;
}
