import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumSellerStatus } from 'src/enums/seller-status.enum';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

export class FindSellersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(Object.values(EnumSellerStatus))
  status?: EnumSellerStatus;

  @IsOptional()
  @IsIn(Object.values(EnumSellerBusinessType))
  business_type?: EnumSellerBusinessType;
}
