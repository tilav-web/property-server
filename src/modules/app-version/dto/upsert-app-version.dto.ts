import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppPlatform } from '../app-version.schema';

export class UpsertAppVersionDto {
  @ApiProperty({ enum: AppPlatform, example: AppPlatform.ANDROID })
  @IsEnum(AppPlatform)
  platform: AppPlatform;

  @ApiProperty({ example: '1.2.3' })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must be in format X.Y.Z' })
  version: string;

  @ApiProperty({ example: 'https://play.google.com/store/apps/details?id=...' })
  @IsUrl()
  store_url: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_force_update?: boolean;

  @ApiPropertyOptional({ example: 'Bug fixes and performance improvements' })
  @IsOptional()
  @IsString()
  release_notes?: string;
}
