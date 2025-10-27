import { IsEnum, IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

export class CreateAdvertiseDto {
  @IsString()
  @IsNotEmpty()
  target: string;

  @IsEnum(EnumAdvertiseType)
  @IsNotEmpty()
  type: EnumAdvertiseType;

  @IsDateString()
  @IsNotEmpty()
  from: string;

  @IsDateString()
  @IsNotEmpty()
  to: string;
}
