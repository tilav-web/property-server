import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnumLanguage } from 'src/enums/language.enum';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(EnumLanguage)
  @IsOptional()
  lan?: EnumLanguage;
}
