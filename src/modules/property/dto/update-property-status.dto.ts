import { IsEnum, IsNotEmpty } from 'class-validator';
import { EnumPropertyStatus } from '../enums/property-status.enum';

export class UpdatePropertyStatusDto {
  @IsNotEmpty()
  @IsEnum(EnumPropertyStatus)
  status: EnumPropertyStatus;
}
