import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hero_title_override?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hero_subtitle_override?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hero_image_srcset?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hero_image_buy_srcset?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hero_image_rent_srcset?: string;

  // Voice AI premium
  @ApiPropertyOptional({ description: 'Voice bepul kunlik limit (anonim + auth)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  voice_daily_free_limit?: number;

  @ApiPropertyOptional({ description: 'Voice premium narxi (DEFAULT_CURRENCY)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  voice_premium_price?: number;

  @ApiPropertyOptional({ description: "Voice premium amal qilish kunlari" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  voice_premium_duration_days?: number;
}
