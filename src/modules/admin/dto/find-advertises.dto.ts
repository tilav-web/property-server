import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';

export class FindAdvertisesDto {
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
  @IsIn(Object.values(EnumAdvertiseStatus))
  status?: EnumAdvertiseStatus;

  @IsOptional()
  @IsIn(Object.values(EnumAdvertiseType))
  type?: EnumAdvertiseType;

  @IsOptional()
  @IsIn(Object.values(EnumPaymentStatus))
  payment_status?: EnumPaymentStatus;
}
