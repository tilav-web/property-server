import { IsString } from 'class-validator';

export class RemoveTokenDto {
  @IsString()
  token: string;
}
