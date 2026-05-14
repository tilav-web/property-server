import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AdminAccessTokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  admin_access_token: string;
}

export class AdminAuthResponseDto extends AdminAccessTokenResponseDto {
  @ApiProperty({ type: Object })
  admin: Record<string, unknown>;
}
