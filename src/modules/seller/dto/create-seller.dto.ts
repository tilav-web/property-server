import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { EnumSellerBusinessType } from 'src/enums/seller-business-type.enum';

export class CreateSellerDto {
  @IsString()
  @IsNotEmpty()
  user: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}\d{7}$/, {
    message:
      'Passport must be in the format AA1234567 (2 uppercase letters and 7 digits)',
  })
  passport: string;

  @IsEnum(EnumSellerBusinessType)
  @IsNotEmpty()
  business_type: EnumSellerBusinessType;
}
