import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsMongoId()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
