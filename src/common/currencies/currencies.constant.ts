import { CurrencyCode } from './currency.enum';

export interface CurrencyMeta {
  code: CurrencyCode;
  numericCode: number;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
  country: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  [CurrencyCode.MYR]: {
    code: CurrencyCode.MYR,
    numericCode: 458,
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    decimals: 2,
    locale: 'ms-MY',
    country: 'MY',
  },
  [CurrencyCode.UZS]: {
    code: CurrencyCode.UZS,
    numericCode: 860,
    symbol: "so'm",
    name: 'Uzbekistani Som',
    decimals: 0,
    locale: 'uz-UZ',
    country: 'UZ',
  },
  [CurrencyCode.USD]: {
    code: CurrencyCode.USD,
    numericCode: 840,
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
    country: 'US',
  },
  [CurrencyCode.IDR]: {
    code: CurrencyCode.IDR,
    numericCode: 360,
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    decimals: 0,
    locale: 'id-ID',
    country: 'ID',
  },
  [CurrencyCode.SGD]: {
    code: CurrencyCode.SGD,
    numericCode: 702,
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimals: 2,
    locale: 'en-SG',
    country: 'SG',
  },
  [CurrencyCode.THB]: {
    code: CurrencyCode.THB,
    numericCode: 764,
    symbol: '฿',
    name: 'Thai Baht',
    decimals: 2,
    locale: 'th-TH',
    country: 'TH',
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = CurrencyCode.MYR;

export const SUPPORTED_CURRENCIES: CurrencyCode[] = Object.values(CurrencyCode);
