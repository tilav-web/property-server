import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EnumRole } from 'src/enums/role.enum';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Email orqali ro‘yxatdan o‘tishda ishlatiladi.',
    example: 'user@example.com',
  })
  @ValidateIf((o: CreateUserDto) => !o.phone)
  @IsEmail({}, { message: "Email to'g'ri ekanligiga ishonch hosil qiling!" })
  @IsNotEmpty({
    message: 'Email yoki telefon raqamlardan birini kiriting!',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefon orqali ro‘yxatdan o‘tishda ishlatiladi.',
    example: '+998901234567',
  })
  @ValidateIf((o: CreateUserDto) => !o.email)
  @Matches(/^\+?\d{9,15}$/, {
    message: 'Telefon raqami noto‘g‘ri formatda!',
  })
  @IsNotEmpty({ message: 'Email yoki telefon raqamlardan birini kiriting!' })
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

  @ApiPropertyOptional({ enum: EnumRole })
  @IsOptional()
  @IsEnum(EnumRole)
  role: EnumRole;
}
