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

export class CreateApartmentSaleDto extends CreatePropertyBaseDto {
  @IsNumber() bedrooms: number;
  @IsNumber() bathrooms: number;
  @IsNumber() floor_level: number;
  @IsNumber() total_floors: number;
  @IsNumber() area: number;

  @IsBoolean() @IsOptional() balcony?: boolean;
  @IsBoolean() @IsOptional() furnished?: boolean;

  @IsEnum(EnumRepairType)
  repair_type: EnumRepairType;

  @IsEnum(EnumHeating)
  heating: EnumHeating;

  @IsBoolean() @IsOptional() air_conditioning?: boolean;
  @IsBoolean() @IsOptional() parking?: boolean;
  @IsBoolean() @IsOptional() elevator?: boolean;

  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  @IsOptional()
  amenities?: EnumAmenities[];
}
