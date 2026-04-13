import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommissionerDto {
  @IsString()
  @IsNotEmpty()
  contract_number: string;

  @IsString()
  @IsNotEmpty()
  contract_start_date: string;

  @IsString()
  @IsNotEmpty()
  contract_end_date: string;
}
