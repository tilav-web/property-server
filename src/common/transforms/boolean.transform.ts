import { Transform } from 'class-transformer';

/**
 * String "true"/"false" -> boolean. FormData orqali kelgan checkbox
 * qiymatlarini class-validator @IsBoolean()'iga moslashtirish uchun.
 * Multipart bo'lmagan JSON bodylarda ham xavfsiz (boolean qiymatga tegmaydi).
 */
export function ToBoolean() {
  return Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    if (value === '' || value === null || value === undefined) return undefined;
    return value;
  });
}
