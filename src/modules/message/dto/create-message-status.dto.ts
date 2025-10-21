import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateMessageStatusDto {
  @IsMongoId()
  @IsNotEmpty()
  message: string;

  @IsMongoId()
  @IsNotEmpty()
  seller: string;
}
