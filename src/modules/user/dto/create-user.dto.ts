import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EnumRole } from 'src/enums/role.enum';

export class CreateUserDto {
  @ApiPropertyOptional({
    description:
      'Asosiy field. Email yoki telefon raqam yuboring. Tavsiya etilgan yangi contract.',
    example: 'user@example.com',
  })
  @ValidateIf((o: CreateUserDto) => !o.email && !o.phone)
  @IsString()
  @IsNotEmpty({
    message: 'Identifier, email yoki telefon raqamlardan birini kiriting!',
  })
  identifier?: string;

  @ApiPropertyOptional({
    description: 'Backward compatibility uchun email alias.',
    example: 'user@example.com',
  })
  @ValidateIf((o: CreateUserDto) => !o.identifier && !o.phone)
  @IsEmail({}, { message: "Email to'g'ri ekanligiga ishonch hosil qiling!" })
  @IsNotEmpty({
    message: 'Identifier, email yoki telefon raqamlardan birini kiriting!',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Backward compatibility uchun phone alias.',
    example: '+998901234567',
  })
  @ValidateIf((o: CreateUserDto) => !o.identifier && !o.email)
  @Matches(/^\+?\d{9,15}$/, {
    message: 'Telefon raqami noto‘g‘ri formatda!',
  })
  @IsNotEmpty({
    message: 'Identifier, email yoki telefon raqamlardan birini kiriting!',
  })
  phone?: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty({ message: "Parol maydoni to'ldirilishi kerak!" })
  @MinLength(8, {
    message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak!",
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Parolda kamida bitta harf va bitta raqam bo'lishi kerak!",
  })
  password: string;

  @ApiPropertyOptional({
    enum: EnumRole,
    enumName: 'EnumRole',
    example: EnumRole.PHYSICAL,
  })
  @IsOptional()
  @IsEnum(EnumRole)
  role: EnumRole;
}
