import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, getApps, initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { PushTokenService } from './push-token.service';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: App | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly pushTokenService: PushTokenService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) {
      this.logger.warn(
        "FIREBASE_SERVICE_ACCOUNT topilmadi — FCM push notificationlar o'chirilgan.",
      );
      return;
    }

    try {
      const serviceAccount = JSON.parse(raw) as ServiceAccount;
      if (getApps().length === 0) {
        this.app = initializeApp({ credential: cert(serviceAccount) });
      } else {
        this.app = getApps()[0]!;
      }
      this.logger.log('Firebase Admin SDK muvaffaqiyatli ishga tushirildi.');
    } catch (err) {
      this.logger.error(
        `FIREBASE_SERVICE_ACCOUNT parse xatosi: ${(err as Error).message}`,
      );
    }
  }

  get isReady(): boolean {
    return this.app !== null;
  }

  /** Bitta FCM token'ga push yuboradi. */
  async sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
    if (!this.app) return false;
    const message: Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      android: {
        notification: { sound: 'default', channelId: 'default' },
      },
    };
    try {
      await getMessaging(this.app).send(message);
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      // Eskirgan tokenni bazadan o'chirish
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        await this.pushTokenService.remove(token).catch(() => null);
      } else {
        this.logger.warn(`FCM sendToToken xato (${code}): ${(err as Error).message}`);
      }
      return false;
    }
  }

  /** Bir nechta token'ga parallel push yuboradi. */
  async sendToTokens(tokens: string[], payload: FcmPayload): Promise<number> {
    if (!this.app || tokens.length === 0) return 0;
    const results = await Promise.allSettled(
      tokens.map((t) => this.sendToToken(t, payload)),
    );
    return results.filter((r) => r.status === 'fulfilled' && r.value).length;
  }

  /** Userning barcha qurilmalariga push yuboradi. */
  async sendToUser(userId: string, payload: FcmPayload): Promise<number> {
    if (!this.app) return 0;
    const tokens = await this.pushTokenService.findTokensByUser(userId);
    if (tokens.length === 0) return 0;
    return this.sendToTokens(tokens, payload);
  }
}
