import { Type } from 'class-transformer';
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

  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  is_vat_payer: boolean; // QQS mavjudmi
}
