import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface EskizLoginResponse {
  data?: { token?: string };
  token_type?: string;
}

interface EskizSendResponse {
  id?: string | number;
  status?: string;
  message?: string;
}

@Injectable()
export class EskizClient implements OnModuleInit {
  private readonly logger = new Logger(EskizClient.name);

  private readonly baseUrl = (
    process.env.ESKIZ_API_URL || 'https://notify.eskiz.uz/api'
  ).replace(/\/$/, '');
  private readonly email = process.env.ESKIZ_EMAIL || '';
  private readonly password = process.env.ESKIZ_PASSWORD || '';
  private readonly defaultFrom = process.env.ESKIZ_DEFAULT_FROM || '4546';

  private token: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  async onModuleInit() {
    if (!this.email || !this.password) {
      this.logger.warn(
        'ESKIZ_EMAIL/ESKIZ_PASSWORD not set — SMS gateway disabled',
      );
      return;
    }
    try {
      await this.refreshToken();
    } catch (err) {
      this.logger.error('Initial Eskiz token fetch failed', err as Error);
    }
  }

  isReady(): boolean {
    return !!(this.email && this.password);
  }

  /**
   * Yagona public method — SMS yuboradi. Token yaroqsiz bo'lsa avtomatik
   * yangilab, bir marta retry qiladi.
   */
  async sendSms(params: {
    mobile_phone: string;
    message: string;
    from?: string;
  }): Promise<EskizSendResponse> {
    if (!this.isReady()) {
      throw new Error('Eskiz SMS gateway is not configured');
    }

    const send = async (): Promise<Response> => {
      const token = await this.ensureToken();
      const form = new FormData();
      form.append('mobile_phone', this.normalizePhone(params.mobile_phone));
      form.append('message', params.message);
      form.append('from', params.from || this.defaultFrom);

      return fetch(`${this.baseUrl}/message/sms/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    };

    let res = await send();

    // Token eskirgan — refresh + retry
    if (res.status === 401) {
      this.logger.warn('Eskiz returned 401 — refreshing token');
      this.token = null;
      await this.refreshToken();
      res = await send();
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Eskiz send failed: HTTP ${res.status} ${res.statusText} — ${text}`,
      );
    }

    return (await res.json().catch(() => ({}))) as EskizSendResponse;
  }

  // ---- internals ----

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    if (this.tokenPromise) return this.tokenPromise;
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    if (this.tokenPromise) return this.tokenPromise;

    this.tokenPromise = (async () => {
      const form = new FormData();
      form.append('email', this.email);
      form.append('password', this.password);

      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Eskiz auth failed: HTTP ${res.status} ${res.statusText} — ${text}`,
        );
      }

      const json = (await res.json()) as EskizLoginResponse;
      const token = json?.data?.token;
      if (!token) {
        throw new Error('Eskiz auth: response did not contain token');
      }
      this.token = token;
      this.logger.log('Eskiz token refreshed');
      return token;
    })().finally(() => {
      this.tokenPromise = null;
    });

    return this.tokenPromise;
  }

  /** Eskiz `998901234567` formatini qabul qiladi. `+`, bo'shliqlarni tozalaymiz. */
  private normalizePhone(input: string): string {
    return input.replace(/[^\d]/g, '');
  }
}
