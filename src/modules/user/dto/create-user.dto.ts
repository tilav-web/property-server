import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { EnumRole } from 'src/enums/role.enum';

export class CreateUserDto {
  @IsEmail({}, { message: "Email to'g'ri ekanligiga ishonch hosil qiling!" })
  @IsNotEmpty({ message: "Email maydoni to'ldirilishi kerak!" })
  email: string;

  @IsNotEmpty({ message: "Parol maydoni to'ldirilishi kerak!" })
  password: string;

  @IsOptional()
  role: EnumRole;
}
