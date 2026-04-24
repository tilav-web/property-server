import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { CurrencyCode } from 'src/common/currencies';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';
import { EnumRentalTarget } from '../enums/rental-target.enum';

/**
 * Umumiy Property create DTO — barcha kategoriya fieldlarini o'z ichiga oladi.
 * Kategoriyaga mos keluvchi fieldlar optional, faqat umumiylari required.
 *
 * Controllerda shu class ishlatiladi — class-validator avtomatik ishlaydi
 * va 400 BadRequest bilan qaytaradi (avvalgidek 500 emas).
 */
export class CreatePropertyDto {
  // ---- Umumiy, majburiy ----
  @IsString({ message: 'Sarlavha kiritilmagan!' })
  title: string;

  @IsString({ message: 'Tavsif kiritilmagan!' })
  description: string;

  @IsString({ message: 'Manzil kiritilmagan!' })
  address: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude kiritilmagan!' })
  location_lat: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude kiritilmagan!' })
  location_lng: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Narx kiritilmagan!' })
  price: number;

  @IsEnum(EnumPropertyCategory, { message: 'Kategoriya tanlanmagan!' })
  category: EnumPropertyCategory;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  // ---- Apartment umumiy fieldlari (ixtiyoriy) ----
  @IsOptional() @Type(() => Number) @IsNumber() bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() bathrooms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() floor_level?: number;
  @IsOptional() @Type(() => Number) @IsNumber() total_floors?: number;
  @IsOptional() @Type(() => Number) @IsNumber() area?: number;

  @IsOptional() @IsBoolean() furnished?: boolean;

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

  @IsOptional()
  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  amenities?: EnumAmenities[];

  // ---- Sale uchun ----
  @IsOptional() @IsBoolean() mortgage_available?: boolean;

  // ---- Rent uchun ----
  @IsOptional() @Type(() => Number) @IsNumber() contract_duration_months?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(EnumRentalTarget, { each: true })
  rental_target?: EnumRentalTarget[];
}

// Backwards compatibility — eski importlar sinmasligi uchun alias
export { CreatePropertyDto as CreatePropertyBaseDto };
