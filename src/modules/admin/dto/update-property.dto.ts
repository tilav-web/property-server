import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnumPropertyStatus } from 'src/modules/property/enums/property-status.enum';
import { EnumPropertyCategory } from 'src/modules/property/enums/property-category.enum';
import { EnumRepairType } from 'src/modules/property/enums/repair-type.enum';
import { EnumHeating } from 'src/modules/property/enums/heating.enum';
import { EnumLandType } from 'src/modules/property/enums/land-type.enum';
import { EnumRentalTarget } from 'src/modules/property/enums/rental-target.enum';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { CurrencyCode, SUPPORTED_CURRENCIES } from 'src/common/currencies';
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
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: CurrencyCode;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_premium?: boolean;

  @IsOptional()
  @IsIn(Object.values(EnumPropertyStatus))
  status?: EnumPropertyStatus;

  /** status=REJECTED bo'lganda admin yozgan sababi (ixtiyoriy). */
  @IsOptional()
  @IsString()
  rejectionNote?: string;

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

  // ---- Kategoriyaga xos maydonlar ----
  // Property discriminator schema'lariga (apartment/commercial/land/garage/
  // hovli, sale/rent) tarqalgan — barchasi shu yerda ixtiyoriy sifatida
  // to'planadi. Har biri faqat propertyning haqiqiy category'siga mos
  // schema path bo'lsagina saqlanadi (AdminPropertyService.update'da).

  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  floor_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_floors?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  land_area?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  floors?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contract_duration_months?: number;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsBoolean()
  mortgage_available?: boolean;

  @IsOptional()
  @IsBoolean()
  has_pit?: boolean;

  @IsOptional()
  @IsBoolean()
  has_electricity?: boolean;

  @IsOptional()
  @IsBoolean()
  is_heated?: boolean;

  @IsOptional()
  @IsBoolean()
  is_electricity?: boolean;

  @IsOptional()
  @IsBoolean()
  is_water?: boolean;

  @IsOptional()
  @IsBoolean()
  is_gas?: boolean;

  @IsOptional()
  @IsBoolean()
  road_access?: boolean;

  @IsOptional()
  @IsIn(Object.values(EnumRepairType))
  repair_type?: EnumRepairType;

  @IsOptional()
  @IsIn(Object.values(EnumHeating))
  heating?: EnumHeating;

  @IsOptional()
  @IsIn(Object.values(EnumLandType))
  land_type?: EnumLandType;

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(EnumAmenities), { each: true })
  amenities?: EnumAmenities[];

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(EnumRentalTarget), { each: true })
  rental_target?: EnumRentalTarget[];
}
