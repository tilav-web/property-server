import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  EnumProjectStatus,
  EnumProjectUnitCategory,
} from '../project.schema';

class UnitTypeInput {
  @IsEnum(EnumProjectUnitCategory)
  category: EnumProjectUnitCategory;

  @IsOptional() @Type(() => Number) @IsNumber() bedrooms_min?: number;
  @IsOptional() @Type(() => Number) @IsNumber() bedrooms_max?: number;
  @IsOptional() @Type(() => Number) @IsNumber() area_min?: number;
  @IsOptional() @Type(() => Number) @IsNumber() area_max?: number;
  @IsOptional() @Type(() => Number) @IsNumber() price_from?: number;
  @IsOptional() @Type(() => Number) @IsNumber() count?: number;
}

class PaymentPlanInput {
  @IsString() name: string;
  @IsOptional() @Type(() => Number) @IsNumber() deposit_percent?: number;
  @IsOptional() @IsString() description?: string;
}

const parseJson = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export class CreateProjectDto {
  @IsMongoId()
  developer: string;

  @IsString()
  name: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;

  @IsOptional() @IsString() delivery_date?: string;

  @IsOptional()
  @IsEnum(EnumProjectStatus)
  status?: EnumProjectStatus;

  @IsOptional() @Type(() => Number) @IsNumber() launch_price?: number;
  @IsOptional() @IsString() currency?: string;

  @IsOptional()
  @Transform(parseJson)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitTypeInput)
  unit_types?: UnitTypeInput[];

  @IsOptional()
  @Transform(parseJson)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentPlanInput)
  payment_plans?: PaymentPlanInput[];

  @IsOptional() @IsString() video_url?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true || value === '1' || value === 1,
  )
  @IsBoolean()
  is_featured?: boolean;
}
