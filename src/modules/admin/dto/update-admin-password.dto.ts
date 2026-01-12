import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  new_password: string;
}
