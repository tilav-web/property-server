import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Hisob raqami majburiy' })
  account_number: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank nomi majburiy' })
  bank_name: string;

  @IsString()
  @IsNotEmpty({ message: 'MFO majburiy' })
  mfo: string;

  @IsString()
  @IsNotEmpty({ message: 'Hisob egasining F.I.SH. majburiy' })
  owner_full_name: string;

  @IsString()
  @IsNotEmpty({ message: 'SWIFT kodi majburiy' })
  swift_code: string;
}
