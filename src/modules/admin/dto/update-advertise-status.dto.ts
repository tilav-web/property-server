import { IsEnum, IsMongoId, IsOptional, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';

export class UpdateAdvertiseStatusDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumAdvertiseStatus)
  status?: EnumAdvertiseStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumPaymentStatus)
  paymentStatus?: EnumPaymentStatus;
}
