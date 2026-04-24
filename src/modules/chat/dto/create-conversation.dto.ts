import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsMongoId()
  peerUserId: string;

  @IsOptional()
  @IsMongoId()
  propertyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  initialMessage?: string;
}
