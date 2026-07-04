import { IsNotEmpty, IsString } from 'class-validator';

export class RemovePhotoDto {
  @IsNotEmpty()
  @IsString()
  url: string;
}
