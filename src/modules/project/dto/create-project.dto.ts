import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { EnumProjectStatus, EnumProjectUnitCategory } from '../project.schema';

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

/**
 * FormData orqali JSON-string sifatida kelgan massivni parse qilib,
 * har bir elementni `cls` instansiyasiga aylantiradi. Buni bitta
 * `@Transform` ichida qilish shart — `@Transform(parseJson)` va
 * `@Type(() => X)`ni alohida decorator sifatida stacklash tartibga
 * bog'liq bo'lib chiqdi: `class-transformer` ba'zan `@Type`ning ichki
 * transformini `@Transform`dan OLDIN yoki keyin chalkash tartibda
 * bajarib, natijada array elementlari hech qachon `X` instansiyasiga
 * aylanmay qoladi — shu sabab `whitelist: true` validatsiyasi ularning
 * har bir maydonini "should not exist" deb rad etardi.
 */
function parseJsonArray<T extends object>(cls: new () => T) {
  return ({ value }: { value: unknown }) => {
    const parsed = typeof value === 'string' ? safeJsonParse(value) : value;
    if (!Array.isArray(parsed)) return parsed;
    return parsed.map((item) => plainToInstance(cls, item));
  };
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export class CreateProjectDto {
  @IsMongoId()
  developer: string;

  @IsString()
  name: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;

  // Xarita nuqtasi — ikkalasi birga yuboriladi (GeoJSON'ga service aylantiradi)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Latitude noto'g'ri!" })
  @Min(-90)
  @Max(90)
  location_lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Longitude noto'g'ri!" })
  @Min(-180)
  @Max(180)
  location_lng?: number;

  @IsOptional() @IsString() delivery_date?: string;

  @IsOptional()
  @IsEnum(EnumProjectStatus)
  status?: EnumProjectStatus;

  @IsOptional() @Type(() => Number) @IsNumber() launch_price?: number;
  @IsOptional() @IsString() currency?: string;

  @IsOptional()
  @Transform(parseJsonArray(UnitTypeInput))
  @IsArray()
  @ValidateNested({ each: true })
  unit_types?: UnitTypeInput[];

  @IsOptional()
  @Transform(parseJsonArray(PaymentPlanInput))
  @IsArray()
  @ValidateNested({ each: true })
  payment_plans?: PaymentPlanInput[];

  @IsOptional() @IsString() video_url?: string;

  @IsOptional()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === '1' || value === 1,
  )
  @IsBoolean()
  is_featured?: boolean;
}
