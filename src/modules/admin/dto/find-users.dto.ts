import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumRole } from 'src/enums/role.enum';
import { EnumSellerStatus } from 'src/enums/seller-status.enum';

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
  @IsEnum(EnumSellerStatus)
  status?: EnumSellerStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
