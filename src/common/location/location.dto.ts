import { IsString, IsArray, IsNumber, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class LocationDto {
  @IsString()
  type: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates: [number, number];
}
