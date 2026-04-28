import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDeveloperDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true || value === '1' || value === 1,
  )
  @IsBoolean()
  is_active?: boolean;
}
