import { IsEnum, IsNumber, IsString } from 'class-validator';
import { EnumPropertyCategory } from '../enums/property-category.enum';
import { CreateApartmentRentDto } from './create-apartment-rent.dto';
import { CreateApartmentSaleDto } from './create-apartment-sale.dto';

export class CreatePropertyBaseDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  address: string;

  @IsNumber()
  location_lat: number;

  @IsNumber()
  location_lng: number;

  @IsNumber()
  price: number;

  @IsEnum(EnumPropertyCategory)
  category: EnumPropertyCategory;
}

export type CreatePropertyDto =
  | CreatePropertyBaseDto
  | CreateApartmentRentDto
  | CreateApartmentSaleDto;
