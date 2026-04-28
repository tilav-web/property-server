import { Injectable, Logger } from '@nestjs/common';
import { EskizClient } from './eskiz.client';

export type SmsLanguage = 'uz' | 'ru' | 'en' | 'ms';
export type OtpPurpose = 'register' | 'reset_password';

const OTP_TEMPLATES: Record<
  OtpPurpose,
  Record<SmsLanguage, (code: string) => string>
> = {
  register: {
    uz: (code) =>
      `Amaar Properties saytida ro'yxatdan o'tish uchun kod - ${code}`,
    ru: (code) => `Код для регистрации на сайте Amaar Properties - ${code}`,
    en: (code) => `Registration code for Amaar Properties website - ${code}`,
    ms: (code) => `Kod pendaftaran untuk laman Amaar Properties - ${code}`,
  },
  reset_password: {
    uz: (code) =>
      `Amaar Properties saytida parolni tiklash uchun kod - ${code}`,
    ru: (code) => `Код для сброса пароля на сайте Amaar Properties - ${code}`,
    en: (code) => `Password reset code for Amaar Properties website - ${code}`,
    ms: (code) =>
      `Kod tetapan semula kata laluan untuk laman Amaar Properties - ${code}`,
  },
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly eskiz: EskizClient) {}

  /**
   * OTP xabarini yuboradi. Har bir til uchun template Eskiz'da alohida
   * tasdiqlangan bo'lishi kerak.
   *
   * Test mode'da (ESKIZ_TEST_MODE=1) Eskiz faqat shu sample matn'ni qabul qiladi:
   *   "Bu Eskiz dan test"
   */
  async sendOtp(
    phone: string,
    code: string,
    language: SmsLanguage = 'uz',
    purpose: OtpPurpose = 'register',
  ): Promise<void> {
    const message = this.buildOtpMessage(code, language, purpose);
    try {
      await this.eskiz.sendSms({ mobile_phone: phone, message });
      if (process.env.ESKIZ_TEST_MODE === '1') {
        this.logger.warn(
          `[TEST_MODE] OTP code for ${this.maskPhone(phone)}: ${code}`,
        );
      } else {
        this.logger.log(
          `OTP SMS sent to ${this.maskPhone(phone)} [${language}/${purpose}]`,
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

  private buildOtpMessage(
    code: string,
    language: SmsLanguage,
    purpose: OtpPurpose,
  ): string {
    if (process.env.ESKIZ_TEST_MODE === '1') {
      return 'Bu Eskiz dan test';
    }
    const set = OTP_TEMPLATES[purpose] ?? OTP_TEMPLATES.register;
    const builder = set[language] ?? set.uz;
    return builder(code);
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '***';
    return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
  }
}
