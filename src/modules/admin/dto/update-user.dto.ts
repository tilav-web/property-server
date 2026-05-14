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
  @IsBoolean()
  emailIsVerified?: boolean;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsPhoneNumber('UZ')
  phoneValue?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
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
