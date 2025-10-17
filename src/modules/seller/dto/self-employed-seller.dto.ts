import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateSelfEmployedSellerDto {
  @IsString()
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
}
