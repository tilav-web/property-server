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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnumRole } from 'src/enums/role.enum';
import { EnumLanguage } from 'src/enums/language.enum';

const valueToBoolean = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return value;
};

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  emailValue?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => valueToBoolean(value))
  @IsBoolean()
  emailIsVerified?: boolean;

  @ApiPropertyOptional({
    example: '+60123456789',
    description:
      "Xalqaro E.164 format (+ prefiks bilan). UZ uchun +998, MY uchun +60.",
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneValue?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => valueToBoolean(value))
  @IsBoolean()
  phoneIsVerified?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    enum: EnumRole,
    enumName: 'EnumRole',
    description: 'Allowed user roles',
    example: EnumRole.PHYSICAL,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumRole)
  role?: EnumRole;

  @ApiPropertyOptional({
    enum: EnumLanguage,
    enumName: 'EnumLanguage',
    description: 'Preferred language',
    example: EnumLanguage.UZ,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumLanguage)
  lan?: EnumLanguage;
}
