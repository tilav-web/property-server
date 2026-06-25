import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleMobileLoginDto {
  @ApiProperty({
    description:
      "Native Google Sign-In SDK qaytargan ID Token (JWT). Server uni Google'ning public key bilan verify qiladi.",
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class AppleMobileLoginDto {
  @ApiProperty({
    description:
      "Native Apple Sign-In SDK qaytargan identityToken (JWT). Server uni Apple'ning public key bilan verify qiladi.",
    example: 'eyJraWQiOiJZdXl...',
  })
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiProperty({
    description:
      "Apple ba'zan birinchi login'da firstName/lastName qaytaradi (keyin emas). Saqlab qo'yish uchun ixtiyoriy.",
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;
}
