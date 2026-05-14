import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

export class CreateSellerRequestDto {
  @ApiProperty({ enum: EnumSellerBusinessType })
  @IsEnum(EnumSellerBusinessType)
  business_type: EnumSellerBusinessType;

  @ApiProperty({ example: 'AB1234567' })
  @IsString()
  @IsNotEmpty()
  passport: string;
}
