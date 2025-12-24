import { IsOptional, IsString, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumRole } from 'src/enums/role.enum';
import { EnumLanguage } from 'src/enums/language.enum';
import { EnumAuthProvider } from 'src/enums/auth-provider.enum';

export class UpdateIdentifierDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class UpdateSocialAccountDto {
  @IsOptional()
  @IsEnum(EnumAuthProvider)
  provider?: EnumAuthProvider;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateIdentifierDto)
  phone?: UpdateIdentifierDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateIdentifierDto)
  email?: UpdateIdentifierDto; // Only allow updating isVerified for email

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(EnumRole)
  role?: EnumRole;

  @IsOptional()
  @IsEnum(EnumLanguage)
  lan?: EnumLanguage;

  // Password update should ideally be a separate action for security
  // @IsOptional()
  // @IsString()
  // password?: string;

  // Social accounts are complex to update directly here, usually managed via OAuth flow
  // @IsOptional()
  // @ValidateNested({ each: true })
  // @Type(() => UpdateSocialAccountDto)
  // socialAccounts?: UpdateSocialAccountDto[];
}
