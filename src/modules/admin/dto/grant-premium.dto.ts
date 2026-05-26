import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class GrantPremiumDto {
  @ApiProperty({
    description: 'Premium qancha kunga beriladi (1..3650)',
    example: 30,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days: number;
}
