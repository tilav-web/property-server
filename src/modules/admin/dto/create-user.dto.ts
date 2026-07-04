import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsEmail,
  IsPhoneNumber,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnumRole } from 'src/enums/role.enum';
import { EnumLanguage } from 'src/enums/language.enum';

export class CreateUserDto {
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

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  emailIsVerified?: boolean;

  @ApiPropertyOptional({
    example: '+998901234567',
    description:
      'Xalqaro E.164 format (+ prefiks bilan). UZ uchun +998, MY uchun +60.',
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneValue?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  phoneIsVerified?: boolean;

  @ApiPropertyOptional({
    description:
      'Ixtiyoriy — bo\'sh qoldirilsa, user keyinroq "Parolni unutdim" orqali o\'rnatadi.',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: EnumRole, enumName: 'EnumRole' })
  @IsOptional()
  @IsEnum(EnumRole)
  role?: EnumRole;

  @ApiPropertyOptional({ enum: EnumLanguage, enumName: 'EnumLanguage' })
  @IsOptional()
  @IsEnum(EnumLanguage)
  lan?: EnumLanguage;
}
