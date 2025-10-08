import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnumLan } from 'src/enums/lan.enum';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(EnumLan)
  @IsOptional()
  lan?: EnumLan;
}
