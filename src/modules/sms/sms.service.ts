import { Injectable, Logger } from '@nestjs/common';
import { EskizClient } from './eskiz.client';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly eskiz: EskizClient) {}

  /**
   * OTP xabarini yuboradi. Eskiz'da template oldindan tasdiqlangan bo'lishi
   * shart — production'da template'ni ro'yxatdan o'tkazishni unutmang.
   *
   * Test mode'da Eskiz faqat shu matnlarni qabul qiladi:
   *   "Это тест от Eskiz" / "Bu Eskiz dan test" / "This is test from Eskiz"
   */
  async sendOtp(phone: string, code: string): Promise<void> {
    const message = this.buildOtpMessage(code);
    try {
      await this.eskiz.sendSms({ mobile_phone: phone, message });
      this.logger.log(`OTP SMS sent to ${this.maskPhone(phone)}`);
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

  private buildOtpMessage(code: string): string {
    // Production'da Eskiz'da tasdiqlangan template ishlating.
    // Test mode uchun Eskiz approved sample matn:
    if (process.env.ESKIZ_TEST_MODE === '1') {
      return 'Bu Eskiz dan test';
    }
    return `Amaar Properties: tasdiqlash kodingiz ${code}. Hech kim bilan baham ko'rmang.`;
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '***';
    return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
  }
}
