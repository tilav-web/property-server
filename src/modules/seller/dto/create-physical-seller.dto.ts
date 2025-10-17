import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreatePhysicalSellerDto {
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
  @Matches(/^[A-Z]{2}\d{7}$/, {
    message:
      'Passport must be in the format AA1234567 (2 uppercase letters and 7 digits)',
  })
  passport: string;
}
