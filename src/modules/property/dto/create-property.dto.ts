import { IsEnum, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { CreateApartmentRentDto } from './create-apartment-rent.dto';
import { CreateApartmentSaleDto } from './create-apartment-sale.dto';
import { EnumPropertyCurrency } from 'src/enums/property-currency.enum';

export class CreatePropertyBaseDto {
  @IsString({ message: 'Sarlavha kiritilmagan!' })
  title: string;

  @IsString({ message: 'Tavsif kiritilmagan!' })
  description: string;

  @IsString({ message: 'Manzil kiritilmagan!' })
  address: string;

  @IsNumber({}, { message: 'Latitude kiritilmagan!' })
  location_lat: number;

  @IsNumber({}, { message: 'Longitude kiritilmagan!' })
  location_lng: number;

  @IsNumber({}, { message: 'Narx kiritilmagan!' })
  price: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumPropertyCategory)
  category?: EnumPropertyCategory;

  @IsOptional()
  @IsEnum(EnumPropertyCurrency)
  currency?: EnumPropertyCurrency;
}

export type CreatePropertyDto =
  | CreatePropertyBaseDto
  | CreateApartmentRentDto
  | CreateApartmentSaleDto;
