import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
