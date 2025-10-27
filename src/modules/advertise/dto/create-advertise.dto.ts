import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

export class CreateAdvertiseDto {
  @IsString()
  @IsNotEmpty()
  target: string;

  @IsEnum(EnumAdvertiseType)
  @IsNotEmpty()
  type: EnumAdvertiseType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  days: string;
}
