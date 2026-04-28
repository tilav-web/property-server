import { Injectable, Logger } from '@nestjs/common';
import { EskizClient } from './eskiz.client';

export type SmsLanguage = 'uz' | 'ru' | 'en' | 'ms';

const OTP_TEMPLATES: Record<SmsLanguage, (code: string) => string> = {
  uz: (code) =>
    `Amaar Properties saytida ro'yxatdan o'tish va kirish uchun kod - ${code}`,
  ru: (code) =>
    `Код для регистрации и входа на сайте Amaar Properties - ${code}`,
  en: (code) =>
    `Registration and login code for Amaar Properties website - ${code}`,
  ms: (code) =>
    `Kod pendaftaran dan log masuk untuk laman Amaar Properties - ${code}`,
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
  ): Promise<void> {
    const message = this.buildOtpMessage(code, language);
    try {
      await this.eskiz.sendSms({ mobile_phone: phone, message });
      if (process.env.ESKIZ_TEST_MODE === '1') {
        this.logger.warn(
          `[TEST_MODE] OTP code for ${this.maskPhone(phone)}: ${code}`,
        );
      } else {
        this.logger.log(
          `OTP SMS sent to ${this.maskPhone(phone)} [${language}]`,
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

  private buildOtpMessage(code: string, language: SmsLanguage): string {
    if (process.env.ESKIZ_TEST_MODE === '1') {
      return 'Bu Eskiz dan test';
    }
    const builder = OTP_TEMPLATES[language] ?? OTP_TEMPLATES.uz;
    return builder(code);
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '***';
    return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
  }
}
