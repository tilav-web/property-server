import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';

export class UpdateAdvertiseDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  target?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(EnumAdvertiseType)
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