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
  @ValidateIf((o: CreateUserDto) => !o.phone)
  @IsEmail({}, { message: "Email to'g'ri ekanligiga ishonch hosil qiling!" })
  @IsNotEmpty({
    message: 'Email yoki telefon raqamlardan birini kiriting!',
  })
  email?: string;

  @ValidateIf((o: CreateUserDto) => !o.email)
  @Matches(/^\+?\d{9,15}$/, {
    message: 'Telefon raqami noto‘g‘ri formatda!',
  })
  @IsNotEmpty({ message: 'Email yoki telefon raqamlardan birini kiriting!' })
  phone?: string;

  @IsNotEmpty({ message: "Parol maydoni to'ldirilishi kerak!" })
  @MinLength(8, {
    message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak!",
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Parolda kamida bitta harf va bitta raqam bo'lishi kerak!",
  })
  password: string;

  @IsOptional()
  @IsEnum(EnumRole)
  role: EnumRole;
}
