import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

export class CreateAdvertiseDto {
  @IsString()
  @IsNotEmpty()
  target: string;

  @IsEnum(EnumAdvertiseType)
  @IsNotEmpty()
  type: EnumAdvertiseType;

  @IsMongoId()
  @IsNotEmpty()
  image: string;
}
