import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { CurrencyCode } from 'src/common/currencies';
import { EnumAmenities } from 'src/enums/amenities.enum';
import { EnumRepairType } from '../enums/repair-type.enum';
import { EnumHeating } from '../enums/heating.enum';
import { EnumRentalTarget } from '../enums/rental-target.enum';
import { ToBoolean } from 'src/common/transforms/boolean.transform';
import { EnumLandType } from '../enums/land-type.enum';

/**
 * Umumiy Property create DTO — barcha kategoriya fieldlarini o'z ichiga oladi.
 * Kategoriyaga mos keluvchi fieldlar optional, faqat umumiylari required.
 *
 * Controllerda shu class ishlatiladi — class-validator avtomatik ishlaydi
 * va 400 BadRequest bilan qaytaradi (avvalgidek 500 emas).
 */
export class CreatePropertyDto {
  // ---- Umumiy, majburiy ----
  // Bo'sh yoki faqat probeldan iborat qiymat Mongoose'da tushunarsiz
  // "Path `uz` is required" xatosiga olib keladi — shuning uchun trim + IsNotEmpty.
  @ApiProperty({ example: '3-room apartment in Mont Kiara' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'Sarlavha kiritilmagan!' })
  @IsNotEmpty({ message: 'Sarlavha kiritilmagan!' })
  title: string;

  @ApiProperty({ example: 'Fully furnished apartment near MRT and shops.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'Tavsif kiritilmagan!' })
  @IsNotEmpty({ message: 'Tavsif kiritilmagan!' })
  description: string;

  @ApiProperty({ example: 'Mont Kiara, Kuala Lumpur' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'Manzil kiritilmagan!' })
  @IsNotEmpty({ message: 'Manzil kiritilmagan!' })
  address: string;

  @ApiProperty({ example: 3.139 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude kiritilmagan!' })
  location_lat: number;

  @ApiProperty({ example: 101.6869 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude kiritilmagan!' })
  location_lng: number;

  @ApiProperty({ example: 850000 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Narx kiritilmagan!' })
  price: number;

  @ApiProperty({
    enum: EnumPropertyCategory,
    enumName: 'EnumPropertyCategory',
    example: EnumPropertyCategory.APARTMENT_SALE,
  })
  @IsEnum(EnumPropertyCategory, { message: 'Kategoriya tanlanmagan!' })
  category: EnumPropertyCategory;

  @ApiPropertyOptional({
    enum: CurrencyCode,
    enumName: 'CurrencyCode',
    description: 'Use ISO 4217 code, for example MYR, USD, UZS.',
    example: CurrencyCode.MYR,
  })
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

  @IsOptional() @ToBoolean() @IsBoolean() furnished?: boolean;

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
  // Multipart'da bitta qiymat string bo'lib keladi — arrayga o'raymiz
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsEnum(EnumAmenities, { each: true })
  amenities?: EnumAmenities[];

  // ---- Hovli uchun ----
  @IsOptional() @Type(() => Number) @IsNumber() rooms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() land_area?: number;
  @IsOptional() @Type(() => Number) @IsNumber() floors?: number;

  // ---- Yer (Land) uchun ----
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumLandType)
  land_type?: EnumLandType;
  @IsOptional() @ToBoolean() @IsBoolean() is_electricity?: boolean;
  @IsOptional() @ToBoolean() @IsBoolean() is_water?: boolean;
  @IsOptional() @ToBoolean() @IsBoolean() is_gas?: boolean;
  @IsOptional() @ToBoolean() @IsBoolean() road_access?: boolean;

  // ---- Garaj uchun ----
  @IsOptional() @ToBoolean() @IsBoolean() has_pit?: boolean;
  @IsOptional() @ToBoolean() @IsBoolean() has_electricity?: boolean;
  @IsOptional() @ToBoolean() @IsBoolean() is_heated?: boolean;

  // ---- Sale uchun ----
  @IsOptional() @ToBoolean() @IsBoolean() mortgage_available?: boolean;

  // ---- Rent uchun ----
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contract_duration_months?: number;

  @IsOptional()
  // Multipart'da bitta qiymat string bo'lib keladi — arrayga o'raymiz
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsEnum(EnumRentalTarget, { each: true })
  rental_target?: EnumRentalTarget[];
}

// Backwards compatibility — eski importlar sinmasligi uchun alias
export { CreatePropertyDto as CreatePropertyBaseDto };
