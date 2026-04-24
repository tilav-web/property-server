import { IsOptional, IsString } from 'class-validator';

export class LanguageDto {
  @IsString()
  uz: string;

  @IsString()
  ru: string;

  @IsString()
  en: string;

  @IsOptional()
  @IsString()
  ms?: string;
}
