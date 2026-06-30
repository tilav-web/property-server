import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Email yoki telefon raqam. Mobile va web uchun asosiy field.',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({
    description: 'Backward compatibility uchun email alias.',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @IsNotEmpty({ message: 'Parol kiritilmagan!' })
  password: string;
}

export class ConfirmOtpDto {
  @ApiProperty({
    description: 'Ro‘yxatdan o‘tgan user ID',
    example: '665f1f1f1f1f1f1f1f1f1f1f',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Email/SMS orqali yuborilgan OTP kod',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'Tasdiqlanmagan user ID',
    example: '665f1f1f1f1f1f1f1f1f1f1f',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class ForgotPasswordDto {
  @ApiPropertyOptional({
    description: 'Email yoki telefon raqam.',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({
    description: 'Backward compatibility uchun email alias.',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '665f1f1f1f1f1f1f1f1f1f1f' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(6, {
    message: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak",
  })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(6, {
    message: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak",
  })
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Mobile clientlar uchun refresh token. Web client refresh_token cookie ishlatadi.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Tasdiqlash kodi yuborildi!' })
  message: string;
}

export class AccessTokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;
}

export class TokenPairResponseDto extends AccessTokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token: string;
}

export class AuthResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: Object })
  user: Record<string, unknown>;
}

export class WebAuthResponseDto extends AccessTokenResponseDto {
  @ApiProperty({ type: Object })
  user: Record<string, unknown>;
}

export class RequestPhoneVerificationDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class ConfirmLoggedInOtpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
