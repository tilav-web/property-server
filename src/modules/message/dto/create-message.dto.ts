import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  property: string;

  @IsString()
  @IsNotEmpty()
  comment: string;

  @Type(() => Number)
  @IsNumber()
  @Max(5)
  @Min(1)
  rating: number;
}
