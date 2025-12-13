import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateYttSellerDto {
  @IsString()
  @IsNotEmpty()
  seller: string;

  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsNotEmpty()
  inn: string; // STIR

  @IsString()
  @IsNotEmpty()
  pinfl: string; // JShShIR

  @IsString()
  @IsNotEmpty()
  business_reg_number: string; // Ro‘yxatdan o‘tish raqami

  @IsString()
  @IsNotEmpty()
  business_reg_address: string; // Ro‘yxatdan o‘tgan manzil

  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  is_vat_payer: boolean;
}
