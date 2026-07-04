import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnumPropertyStatus } from '../enums/property-status.enum';

export class UpdatePropertyStatusDto {
  @IsNotEmpty()
  @IsEnum(EnumPropertyStatus)
  status: EnumPropertyStatus;

  /** REJECTED bo'lganda admin yozgan sababi (ixtiyoriy). */
  @IsOptional()
  @IsString()
  note?: string;
}
