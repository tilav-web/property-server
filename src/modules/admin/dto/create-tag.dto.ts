import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'sea-view' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
