import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateMchjSellerDto {
  @IsString()
  @IsNotEmpty()
  seller: string; // Seller ID (ObjectId bo‘lishi shart)

  @IsString()
  @IsNotEmpty()
  company_name: string; // Kompaniya nomi

  @IsString()
  @IsNotEmpty()
  stir: string; // STIR

  @IsString()
  @IsNotEmpty()
  oked: string; // OKED

  @IsString()
  @IsNotEmpty()
  registration_address: string; // Biznes ro'yxatdan o'tgan manzili

  @IsBoolean()
  @IsNotEmpty()
  is_vat_payer: boolean; // QQS mavjudmi
}
