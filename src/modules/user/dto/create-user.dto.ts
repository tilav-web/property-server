import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';
import { EnumRole } from 'src/enums/role.enum';

export class CreateUserDto {
  @IsEmail({}, { message: "Email to'g'ri ekanligiga ishonch hosil qiling!" })
  @IsNotEmpty({ message: "Email maydoni to'ldirilishi kerak!" })
  email: string;

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
