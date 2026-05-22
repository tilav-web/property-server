import { Injectable, Logger } from '@nestjs/common';
import { CountryConfigService } from 'src/common/config/country.config';
import { EskizClient } from './eskiz.client';

// Eskiz O'zbekiston operator zonasidan tashqari tildagi shablonlarni qabul
// qilmaydi — shuning uchun SMS har doim faqat o'zbek tilida yuboriladi.
// SmsLanguage type API uchun saqlangan, lekin SMS tarkibiga ta'sir qilmaydi.
export type SmsLanguage = 'uz' | 'ru' | 'en' | 'ms';
export type OtpPurpose = 'register' | 'reset_password';

// Eskiz'da har bir template MODERATION'dan o'tishi kerak. Quyidagi matnlar
// Eskiz panelida shu KO'RINISHDA (bo'sh joy va tinish belgilari bilan)
// approved bo'lishi shart, aks holda SMS yetkazib berilmaydi.
// Kod o'rniga 0000 yoki {code} platsholderlari Eskiz'da ko'rsatiladi, real
// yuborilganda kod soni qo'yiladi.
type BrandTemplates = Record<OtpPurpose, (code: string) => string>;

const AMAAR_TEMPLATES: BrandTemplates = {
  register: (code) =>
    `Amaar Properties saytida ro'yxatdan o'tish uchun kod - ${code}`,
  reset_password: (code) =>
    `Amaar Properties saytida parolni tiklash uchun kod - ${code}`,
};

const UYBOS_TEMPLATES: BrandTemplates = {
  register: (code) =>
    `uybos.uz saytida ro'yxatdan o'tish uchun kod: ${code}`,
  reset_password: (code) =>
    `uybos.uz saytida parolni tiklash uchun kod: ${code}`,
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly eskiz: EskizClient,
    private readonly countryConfig: CountryConfigService,
  ) {}

  /** Mamlakatga qarab brand template'ni tanlaydi. */
  private get templates(): BrandTemplates {
    return this.countryConfig.country === 'UZ'
      ? UYBOS_TEMPLATES
      : AMAAR_TEMPLATES;
  }

  /**
   * OTP xabarini yuboradi. Eskiz O'zbekiston zonasidan tashqari tilni qabul
   * qilmaydi — shuning uchun matn har doim o'zbekcha. `language` parametri
   * eski API moslashuvi uchun, foydalanilmaydi.
   *
   * Test mode'da (ESKIZ_TEST_MODE=1) Eskiz faqat shu sample matn'ni qabul qiladi:
   *   "Bu Eskiz dan test"
   */
  async sendOtp(
    phone: string,
    code: string,
    _language: SmsLanguage = 'uz',
    purpose: OtpPurpose = 'register',
  ): Promise<void> {
    const message = this.buildOtpMessage(code, purpose);
    try {
      await this.eskiz.sendSms({ mobile_phone: phone, message });
      if (process.env.ESKIZ_TEST_MODE === '1') {
        this.logger.warn(
          `[TEST_MODE] OTP code for ${this.maskPhone(phone)}: ${code}`,
        );
      } else {
        this.logger.log(
          `OTP SMS sent to ${this.maskPhone(phone)} [${purpose}]`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to send OTP SMS to ${this.maskPhone(phone)}`,
        err as Error,
      );
      throw err;
    }
  }

  async sendCustom(phone: string, message: string): Promise<void> {
    await this.eskiz.sendSms({ mobile_phone: phone, message });
  }

  private buildOtpMessage(code: string, purpose: OtpPurpose): string {
    if (process.env.ESKIZ_TEST_MODE === '1') {
      return 'Bu Eskiz dan test';
    }
    const brand = this.templates;
    const builder = brand[purpose] ?? brand.register;
    return builder(code);
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '***';
    return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
  }
}
