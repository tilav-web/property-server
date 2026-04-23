/**
 * AI tomonidan generatsiya qilingan MongoDB query'ni xavfsiz qilish.
 *
 * Whitelist yondashuvi: faqat oldindan ruxsat etilgan fieldlar va operatorlar
 * o'tadi. Boshqasi — jim tashlab yuboriladi (rad etilmaydi, chunki AI ba'zan
 * nokerak field qaytaradi — bu user xatosi emas).
 */

export type SanitizedQuery = Record<string, unknown>;

const ALLOWED_OPERATORS = new Set([
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$in',
  '$nin',
  '$regex',
  '$options',
  '$exists',
  '$and',
  '$or',
  '$all',
]);

const BLOCKED_OPERATORS = new Set([
  '$where',
  '$expr',
  '$function',
  '$accumulator',
  '$lookup',
  '$graphLookup',
  '$out',
  '$merge',
]);

const ALLOWED_FIELDS = new Set([
  'category',
  'currency',
  'price',
  'is_premium',
  'rating',

  'title.uz',
  'title.ru',
  'title.en',
  'description.uz',
  'description.ru',
  'description.en',
  'address.uz',
  'address.ru',
  'address.en',

  'bedrooms',
  'bathrooms',
  'floor_level',
  'total_floors',
  'area',
  'balcony',
  'furnished',
  'repair_type',
  'heating',
  'air_conditioning',
  'parking',
  'elevator',
  'amenities',
  'mortgage_available',
  'contract_duration_months',
  'rental_target',
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

function sanitizeRegexValue(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  if (raw.length > 200) return raw.slice(0, 200);
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) return undefined;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (BLOCKED_OPERATORS.has(k)) continue;
    if (k.startsWith('$') && !ALLOWED_OPERATORS.has(k)) continue;

    if (k === '$regex') {
      const safe = sanitizeRegexValue(v);
      if (safe !== undefined) out[k] = safe;
      continue;
    }

    if (k === '$options') {
      if (typeof v === 'string' && /^[imsx]{0,4}$/.test(v)) out[k] = v;
      continue;
    }

    const cleaned = sanitizeValue(v);
    if (cleaned !== undefined) out[k] = cleaned;
  }
  return out;
}

function sanitizeClause(input: unknown): SanitizedQuery {
  if (!isPlainObject(input)) return {};

  const out: SanitizedQuery = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (BLOCKED_OPERATORS.has(key)) continue;

    if (key === '$and' || key === '$or') {
      if (!Array.isArray(rawValue)) continue;
      const clauses = rawValue
        .map((clause) => sanitizeClause(clause))
        .filter((c) => Object.keys(c).length > 0);
      if (clauses.length > 0) out[key] = clauses;
      continue;
    }

    if (key.startsWith('$')) continue;

    if (!ALLOWED_FIELDS.has(key)) continue;

    const cleaned = sanitizeValue(rawValue);
    if (cleaned === undefined) continue;
    out[key] = cleaned;
  }

  return out;
}

export function sanitizeAiQuery(raw: unknown): SanitizedQuery {
  return sanitizeClause(raw);
}
