import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumRole } from 'src/enums/role.enum';

export class FindUsersDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsEnum(EnumRole)
  role?: EnumRole;

  @IsOptional()
  @IsString()
  search?: string;
}
