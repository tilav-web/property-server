import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateSelfEmployedSellerDto {
  @IsMongoId()
  @IsNotEmpty()
  seller: string; // Seller ID (ObjectId bo‘lishi shart)

  @IsString()
  @IsNotEmpty()
  first_name: string; // Ism

  @IsString()
  @IsNotEmpty()
  last_name: string; // Familiya

  @IsString()
  @IsNotEmpty()
  middle_name: string; // Otasining ismi

  @IsDateString()
  @IsNotEmpty()
  birth_date: string; // Tug‘ilgan sana (ISO format: YYYY-MM-DD)

  @IsString()
  @IsNotEmpty()
  jshshir: string; // JShShIR

  @IsString()
  @IsNotEmpty()
  registration_number: string; // Ro'yxatdan o'tish raqami

  @IsString()
  @IsNotEmpty()
  registration_address: string; // Biznes ro'yxatdan o'tgan manzili

  @IsBoolean()
  @IsNotEmpty()
  is_vat_payer: boolean; // QQS mavjudmi
}
