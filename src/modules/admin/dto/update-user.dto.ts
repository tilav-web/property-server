import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';
import { EnumRole } from 'src/enums/role.enum';
import { EnumLanguage } from 'src/enums/language.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  emailValue?: string;

  @IsOptional()
  @IsBoolean()
  emailIsVerified?: boolean;

  @IsOptional()
  @IsPhoneNumber('UZ')
  phoneValue?: string;

  @IsOptional()
  @IsBoolean()
  phoneIsVerified?: boolean;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(EnumRole)
  role?: EnumRole;

  @IsOptional()
  @IsEnum(EnumLanguage)
  lan?: EnumLanguage;
}
