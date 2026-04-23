import { CurrencyCode } from './currency.enum';
import { CURRENCIES, CurrencyMeta, DEFAULT_CURRENCY } from './currencies.constant';

export function getCurrencyMeta(code: string | undefined | null): CurrencyMeta {
  if (!code) return CURRENCIES[DEFAULT_CURRENCY];
  const upper = code.toUpperCase() as CurrencyCode;
  return CURRENCIES[upper] ?? CURRENCIES[DEFAULT_CURRENCY];
}

export function isSupportedCurrency(code: string | undefined | null): code is CurrencyCode {
  if (!code) return false;
  return Object.values(CurrencyCode).includes(code.toUpperCase() as CurrencyCode);
}

export function formatPrice(amount: number, code: string | undefined | null): string {
  const meta = getCurrencyMeta(code);
  const formatter = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return formatter.format(amount);
}
