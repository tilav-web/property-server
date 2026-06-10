import { IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { BroadcastTargetGroup } from '../schemas/broadcast-notification.schema';

export class SendBroadcastDto {
  @IsString()
  @MinLength(1)
  title: string;

  /** HTML matn (TipTap chiqargan). Backend plain text'ga aylantiradi. */
  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(BroadcastTargetGroup)
  targetGroup?: BroadcastTargetGroup;
}
