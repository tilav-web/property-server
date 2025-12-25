import { IsIn, IsEnum } from 'class-validator';
import { EnumSellerStatus } from 'src/enums/seller-status.enum';

export class UpdateSellerDto {
  @IsEnum(EnumSellerStatus)
  status: EnumSellerStatus;
}
