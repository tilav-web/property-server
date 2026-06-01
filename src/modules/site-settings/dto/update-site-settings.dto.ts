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

  // Premium obuna (umumiy: voice + property + chegirma)
  @ApiPropertyOptional({ description: 'Voice bepul kunlik limit (anonim + auth)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  voice_daily_free_limit?: number;

  @ApiPropertyOptional({ description: 'Bepul user nechta property yarata oladi' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  free_property_limit?: number;

  @ApiPropertyOptional({ description: 'Premium narxi (DEFAULT_CURRENCY)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  premium_price?: number;

  @ApiPropertyOptional({ description: 'Premium amal qilish kunlari' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  premium_duration_days?: number;

  @ApiPropertyOptional({
    description: "Premium user uchun PROPERTY_PREMIUM chegirma foizi (0-90)",
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  @IsOptional()
  premium_property_discount_percent?: number;

  // Bosh sahifa download CTA
  @ApiPropertyOptional({ description: 'App Store havolasi' })
  @IsString()
  @IsOptional()
  app_store_url?: string;

  @ApiPropertyOptional({ description: 'Google Play havolasi' })
  @IsString()
  @IsOptional()
  play_store_url?: string;

  // Payme fiskal (Cheklar oborotda ko'rinishi uchun)
  @ApiPropertyOptional({
    description: 'Premium obuna uchun MXIK kodi (tasnif.soliq.uz)',
    example: '10305008003000000',
  })
  @IsString()
  @IsOptional()
  premium_mxik?: string;

  @ApiPropertyOptional({
    description: 'Premium obuna uchun package_code (MXIK ga bog\'liq). 1546532 = xizmat (so\'m).',
    example: '1546532',
  })
  @IsString()
  @IsOptional()
  premium_package_code?: string;

  @ApiPropertyOptional({
    description: "Property TOP (PROPERTY_PREMIUM) uchun MXIK kodi",
    example: '10305008003000000',
  })
  @IsString()
  @IsOptional()
  property_premium_mxik?: string;

  @ApiPropertyOptional({
    description: "Property TOP uchun package_code. 1546532 = xizmat (so'm).",
    example: '1546532',
  })
  @IsString()
  @IsOptional()
  property_premium_package_code?: string;

  @ApiPropertyOptional({
    description: 'Reklama (ADVERTISE) uchun MXIK kodi',
    example: '10305008004000000',
  })
  @IsString()
  @IsOptional()
  advertise_mxik?: string;

  @ApiPropertyOptional({
    description: "Reklama uchun package_code. 1546606 = xizmat (so'm).",
    example: '1546606',
  })
  @IsString()
  @IsOptional()
  advertise_package_code?: string;

  @ApiPropertyOptional({
    description: 'QQS foizi (0, 12, 15). Standart: 12%',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  @IsOptional()
  vat_percent?: number;
}
