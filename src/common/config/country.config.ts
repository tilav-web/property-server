import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyCode } from '../currencies/currency.enum';
import { CURRENCIES } from '../currencies/currencies.constant';

export type CountryCode = 'UZ' | 'MY';
export type LanguageCode = 'uz' | 'ru' | 'en' | 'ms';

const SUPPORTED_COUNTRIES: ReadonlyArray<CountryCode> = ['UZ', 'MY'];
const SUPPORTED_LANGUAGE_CODES: ReadonlyArray<LanguageCode> = [
  'uz',
  'ru',
  'en',
  'ms',
];

/**
 * Mamlakatga xos default qiymatlar. ENV qoldirib ketsa shu yerdagi
 * default ishlatiladi.
 */
const COUNTRY_DEFAULTS: Record<
  CountryCode,
  {
    currency: CurrencyCode;
    language: LanguageCode;
    supportedLanguages: LanguageCode[];
    mapCenter: [number, number];
    mapZoom: number;
    smsProvider: 'eskiz' | 'twilio';
  }
> = {
  UZ: {
    currency: CurrencyCode.UZS,
    language: 'uz',
    supportedLanguages: ['uz', 'ru', 'en'],
    mapCenter: [41.2995, 69.2401], // Toshkent
    mapZoom: 12,
    smsProvider: 'eskiz',
  },
  MY: {
    currency: CurrencyCode.MYR,
    language: 'en',
    supportedLanguages: ['en', 'ms'],
    mapCenter: [3.139, 101.6869], // Kuala Lumpur
    mapZoom: 12,
    smsProvider: 'twilio',
  },
};

@Injectable()
export class CountryConfigService {
  private readonly logger = new Logger(CountryConfigService.name);

  readonly country: CountryCode;
  readonly defaultCurrency: CurrencyCode;
  readonly defaultLanguage: LanguageCode;
  readonly supportedLanguages: LanguageCode[];
  readonly mapCenter: [number, number];
  readonly mapZoom: number;
  readonly smsProvider: 'eskiz' | 'twilio';
  readonly advertiseDailyPrice: number;
  readonly advertiseCurrency: CurrencyCode;

  constructor(private readonly config: ConfigService) {
    this.country = this.resolveCountry();
    const defaults = COUNTRY_DEFAULTS[this.country];

    this.defaultCurrency = this.resolveCurrency(
      config.get<string>('DEFAULT_CURRENCY'),
      defaults.currency,
    );
    this.defaultLanguage = this.resolveLanguage(
      config.get<string>('DEFAULT_LANGUAGE'),
      defaults.language,
    );
    this.supportedLanguages = this.resolveSupportedLanguages(
      config.get<string>('SUPPORTED_LANGUAGES'),
      defaults.supportedLanguages,
    );
    this.mapCenter = this.resolveMapCenter(
      config.get<string>('DEFAULT_MAP_CENTER'),
      defaults.mapCenter,
    );
    this.mapZoom = this.resolveMapZoom(
      config.get<string>('DEFAULT_MAP_ZOOM'),
      defaults.mapZoom,
    );
    this.smsProvider = this.resolveSmsProvider(
      config.get<string>('SMS_PROVIDER'),
      defaults.smsProvider,
    );
    this.advertiseDailyPrice = this.resolveAdvertiseDailyPrice(
      config.get<string>('ADVERTISE_DAILY_PRICE'),
    );
    this.advertiseCurrency = this.resolveCurrency(
      config.get<string>('ADVERTISE_CURRENCY'),
      this.defaultCurrency,
    );

    this.logger.log(
      `CountryConfig: ${this.country} | currency=${this.defaultCurrency} | lang=${this.defaultLanguage} | sms=${this.smsProvider}`,
    );
  }

  /** Qulay: foydalanuvchi tomonidan qabul qilinadigan currency yaroqlimi? */
  isSupportedCurrency(code: string): code is CurrencyCode {
    return Object.values(CurrencyCode).includes(code as CurrencyCode);
  }

  /** Currency metadatasi (locale, symbol, decimals). */
  currencyMeta(code: CurrencyCode = this.defaultCurrency) {
    return CURRENCIES[code];
  }

  // ---- privates ----

  private resolveCountry(): CountryCode {
    const raw = (this.config.get<string>('COUNTRY') ?? 'UZ').toUpperCase();
    if (SUPPORTED_COUNTRIES.includes(raw as CountryCode)) {
      return raw as CountryCode;
    }
    this.logger.warn(
      `COUNTRY="${raw}" qo'llab-quvvatlanmaydi, UZ ishlatiladi. Mavjudlar: ${SUPPORTED_COUNTRIES.join(', ')}`,
    );
    return 'UZ';
  }

  private resolveCurrency(
    raw: string | undefined,
    fallback: CurrencyCode,
  ): CurrencyCode {
    if (!raw) return fallback;
    const upper = raw.toUpperCase();
    if (this.isSupportedCurrency(upper)) return upper;
    this.logger.warn(
      `Currency "${raw}" CurrencyCode enum'da yo'q, fallback ${fallback}`,
    );
    return fallback;
  }

  private resolveLanguage(
    raw: string | undefined,
    fallback: LanguageCode,
  ): LanguageCode {
    if (!raw) return fallback;
    const lower = raw.toLowerCase();
    if (SUPPORTED_LANGUAGE_CODES.includes(lower as LanguageCode)) {
      return lower as LanguageCode;
    }
    this.logger.warn(`Language "${raw}" qo'llab-quvvatlanmaydi, ${fallback}`);
    return fallback;
  }

  private resolveSupportedLanguages(
    raw: string | undefined,
    fallback: LanguageCode[],
  ): LanguageCode[] {
    if (!raw) return fallback;
    const parsed = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is LanguageCode =>
        SUPPORTED_LANGUAGE_CODES.includes(s as LanguageCode),
      );
    return parsed.length > 0 ? parsed : fallback;
  }

  private resolveMapCenter(
    raw: string | undefined,
    fallback: [number, number],
  ): [number, number] {
    if (!raw) return fallback;
    const parts = raw.split(',').map((s) => Number(s.trim()));
    if (parts.length !== 2 || !parts.every(Number.isFinite)) {
      this.logger.warn(
        `DEFAULT_MAP_CENTER "${raw}" noto'g'ri formatda. "lat,lng" kutilgan.`,
      );
      return fallback;
    }
    return [parts[0], parts[1]];
  }

  private resolveMapZoom(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 && n < 22 ? n : fallback;
  }

  private resolveSmsProvider(
    raw: string | undefined,
    fallback: 'eskiz' | 'twilio',
  ): 'eskiz' | 'twilio' {
    if (!raw) return fallback;
    const lower = raw.toLowerCase();
    if (lower === 'eskiz' || lower === 'twilio') return lower;
    this.logger.warn(`SMS_PROVIDER "${raw}" qo'llab-quvvatlanmaydi`);
    return fallback;
  }

  private resolveAdvertiseDailyPrice(raw: string | undefined): number {
    if (!raw) return 20000;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 20000;
  }
}
