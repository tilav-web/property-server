import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '../schemas/device-token.schema';

export class RegisterTokenDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  locale?: string;
}
