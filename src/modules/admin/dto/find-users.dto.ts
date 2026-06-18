import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from 'src/common/transforms/boolean.transform';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnumRole } from 'src/enums/role.enum';

export class FindUsersDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    enum: EnumRole,
    enumName: 'EnumRole',
    description: 'User role filter. Allowed values are shown in the dropdown.',
    example: EnumRole.PHYSICAL,
  })
  @IsOptional()
  @IsString()
  @IsEnum(EnumRole)
  role?: EnumRole;

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'true = faqat premium, false = faqat oddiy' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isPremium?: boolean;
}
