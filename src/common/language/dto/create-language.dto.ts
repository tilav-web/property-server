import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @IsNotEmpty()
  uz: string;

  @IsString()
  @IsNotEmpty()
  ru: string;

  @IsString()
  @IsNotEmpty()
  en: string;
}
