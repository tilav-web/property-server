import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

export class UpdateAdvertiseDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  target?: string;

  @IsEnum(EnumAdvertiseType)
  @IsNotEmpty()
  @IsOptional()
  type?: EnumAdvertiseType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  days?: number;

  @IsBoolean()
  @IsOptional()
  image_to_delete?: boolean;
}