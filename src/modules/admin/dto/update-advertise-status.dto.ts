import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';

export class UpdateAdvertiseStatusDto {
  @IsEnum(EnumAdvertiseStatus)
  @IsOptional()
  status: EnumAdvertiseStatus;

  @IsEnum(EnumPaymentStatus)
  @IsOptional()
  paymentStatus: EnumPaymentStatus;
}
