import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommissionerDto {
  @IsString()
  @IsNotEmpty()
  contract_number: string;

  @IsOptional()
  @IsString()
  contract_start_date?: string;

  @IsOptional()
  @IsString()
  contract_end_date?: string;
}
