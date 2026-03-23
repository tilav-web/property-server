import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsEmail,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
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
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumRole)
  role?: EnumRole;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumLanguage)
  lan?: EnumLanguage;
}
