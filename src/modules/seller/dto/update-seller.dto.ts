import { IsOptional, IsString } from 'class-validator';

export class UpdateSellerDto {
  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}
