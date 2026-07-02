import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { PropertyService } from '../property/property.service';
import { EnumPropertyStatus } from '../property/enums/property-status.enum';

// Telegram sendMediaGroup limiti — bitta media group'da maksimal 10 ta rasm
const MAX_PHOTOS = 10;
// Telegram caption limiti — 1024 belgi
const MAX_CAPTION = 1024;

export interface PropertyCreatedEvent {
  propertyId: string;
  category: string;
  title?: string;
  address?: string;
  price?: number;
  currency?: string;
  bedrooms?: number;
  photos: string[];
  authorName?: string;
  authorPhone?: string;
}

/** notifyAllAdmins mirror'i — admin panelga boradigan har bir xabar botga ham. */
export interface AdminNotificationEvent {
  title: string;
  body: string;
  link?: string;
}

interface TelegramConfig {
  token: string;
  chatIds: string[];
}

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number | string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { first_name?: string; last_name?: string };
    message?: {
      message_id: number;
      chat?: { id: number | string };
      text?: string;
    };
  };
}

/**
 * Super admin uchun Telegram xabarnomalar + inline tasdiqlash.
 *
 * Sozlash — admin panel (Sayt sozlamalari → Telegram bot): bot token va
 * chat ID'lar site_settings'da saqlanadi. ENV (TELEGRAM_BOT_TOKEN,
 * TELEGRAM_ADMIN_CHAT_ID) fallback sifatida qoladi.
 *
 * Oqimlar:
 *  - property.created → rasmlar (media group) + ✅/❌ inline tugmali xabar
 *  - admin.notification.created → matnli xabar (to'lov va boshqa admin
 *    xabarnomalari — notifyAllAdmins mirror'i)
 *  - Webhook (POST /telegram/webhook) → tugma bosilganda property
 *    APPROVED/REJECTED qilinadi; /start yoki /id yuborilsa chat ID
 *    qaytariladi (sozlashni osonlashtirish uchun)
 *
 * Token sozlanmagan bo'lsa servis jim turadi — hech narsani buzmaydi.
 */
@Injectable()
export class TelegramAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramAdminService.name);

  constructor(
    private readonly siteSettings: SiteSettingsService,
    private readonly propertyService: PropertyService,
  ) {}

  onApplicationBootstrap() {
    // Boot'ni bloklamaslik uchun fire-and-forget
    void this.syncWebhook();
  }

  @OnEvent('telegram.settings.updated', { async: true })
  async onSettingsUpdated(): Promise<void> {
    await this.syncWebhook();
  }

  // ---- config ----

  private async getConfig(): Promise<TelegramConfig | null> {
    let dbToken: string | null | undefined;
    let dbChatIds: string[] = [];
    try {
      const s = await this.siteSettings.get();
      dbToken = s.telegram_bot_token;
      dbChatIds = s.telegram_admin_chat_ids ?? [];
    } catch (err) {
      this.logger.warn(`Site settings o'qib bo'lmadi: ${String(err)}`);
    }

    const token = dbToken?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) return null;

    const chatIds = (
      dbChatIds.length
        ? dbChatIds
        : (process.env.TELEGRAM_ADMIN_CHAT_ID ?? '').split(',')
    )
      .map((id) => id.trim())
      .filter(Boolean);

    return { token, chatIds };
  }

  /** Webhook secret — tokendan deterministik hosil qilinadi (saqlash shart emas). */
  private secretFor(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async verifySecret(headerSecret: string | undefined): Promise<boolean> {
    if (!headerSecret) return false;
    const config = await this.getConfig();
    if (!config) return false;
    return headerSecret === this.secretFor(config.token);
  }

  /** Token o'zgarganda yoki app ko'tarilganda webhookni ro'yxatdan o'tkazadi. */
  private async syncWebhook(): Promise<void> {
    const config = await this.getConfig();
    if (!config) return;

    const serverUrl = process.env.SERVER_URL?.replace(/\/$/, '');
    if (!serverUrl) {
      this.logger.warn('SERVER_URL yo‘q — Telegram webhook o‘rnatilmadi');
      return;
    }

    try {
      await this.call(config.token, 'setWebhook', {
        url: `${serverUrl}/telegram/webhook`,
        secret_token: this.secretFor(config.token),
        allowed_updates: ['message', 'callback_query'],
      });
      this.logger.log('Telegram webhook o‘rnatildi');
    } catch (err) {
      this.logger.warn(`Telegram webhook o'rnatilmadi: ${String(err)}`);
    }
  }

  // ---- outgoing notifications ----

  @OnEvent('property.created', { async: true })
  async onPropertyCreated(event: PropertyCreatedEvent): Promise<void> {
    const config = await this.getConfig();
    if (!config || config.chatIds.length === 0) return;

    const caption = this.buildPropertyCaption(event);
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ Tasdiqlash',
            callback_data: `prop:approve:${event.propertyId}`,
          },
          {
            text: '❌ Rad etish',
            callback_data: `prop:reject:${event.propertyId}`,
          },
        ],
      ],
    };

    for (const chatId of config.chatIds) {
      try {
        // Media group inline tugma ko'tarmaydi (Telegram cheklovi) — shuning
        // uchun rasmlar alohida, tugmali qaror xabari alohida yuboriladi.
        if (event.photos.length > 0) {
          await this.sendMediaGroup(config.token, chatId, event.photos, caption);
          await this.call(config.token, 'sendMessage', {
            chat_id: chatId,
            text: `⬆️ <b>${this.escape(event.title ?? "E'lon")}</b> — qaror qabul qiling:`,
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
        } else {
          await this.call(config.token, 'sendMessage', {
            chat_id: chatId,
            text: caption,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: keyboard,
          });
        }
      } catch (err) {
        this.logger.warn(
          `Property notification failed (chat=${chatId}): ${String(err)}`,
        );
      }
    }
  }

  @OnEvent('admin.notification.created', { async: true })
  async onAdminNotification(event: AdminNotificationEvent): Promise<void> {
    const config = await this.getConfig();
    if (!config || config.chatIds.length === 0) return;

    const lines = [
      `🔔 <b>${this.escape(event.title)}</b>`,
      this.escape(event.body),
      event.link
        ? `\n🔗 <a href="${process.env.CLIENT_URL ?? ''}${event.link}">Ko‘rish</a>`
        : null,
    ].filter((l): l is string => l !== null);

    for (const chatId of config.chatIds) {
      try {
        await this.call(config.token, 'sendMessage', {
          chat_id: chatId,
          text: lines.join('\n'),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      } catch (err) {
        this.logger.warn(
          `Admin notification failed (chat=${chatId}): ${String(err)}`,
        );
      }
    }
  }

  // ---- incoming webhook ----

  /** Webhook update'ni qayta ishlaydi. Hech qachon throw qilmaydi. */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config) return;

      if (update.callback_query) {
        await this.handleCallback(config, update.callback_query);
        return;
      }

      // /start yoki /id — chat ID'ni qaytarish (sozlashda kerak)
      const msg = update.message;
      const text = msg?.text?.trim();
      if (msg?.chat?.id && (text === '/start' || text === '/id')) {
        await this.call(config.token, 'sendMessage', {
          chat_id: msg.chat.id,
          text:
            `Sizning chat ID: <code>${msg.chat.id}</code>\n\n` +
            'Ushbu ID\'ni admin panel → Sayt sozlamalari → "Telegram bot" ' +
            "bo'limiga kiriting — shundan so'ng xabarnomalar shu chatga keladi.",
          parse_mode: 'HTML',
        });
      }
    } catch (err) {
      this.logger.warn(`handleUpdate failed: ${String(err)}`);
    }
  }

  private async handleCallback(
    config: TelegramConfig,
    cb: NonNullable<TelegramUpdate['callback_query']>,
  ): Promise<void> {
    const answer = (text: string) =>
      this.call(config.token, 'answerCallbackQuery', {
        callback_query_id: cb.id,
        text,
      }).catch(() => {});

    const match = /^prop:(approve|reject):([a-f0-9]{24})$/.exec(cb.data ?? '');
    if (!match) {
      await answer('Noma’lum buyruq');
      return;
    }

    // Faqat sozlangan chatlardan kelgan bosishlar qabul qilinadi
    const chatId = String(cb.message?.chat?.id ?? '');
    if (!config.chatIds.includes(chatId)) {
      await answer('Ruxsat yo‘q');
      return;
    }

    const [, action, propertyId] = match;
    const status =
      action === 'approve'
        ? EnumPropertyStatus.APPROVED
        : EnumPropertyStatus.REJECTED;

    try {
      await this.propertyService.updateStatus({ id: propertyId, status });
    } catch (err) {
      this.logger.warn(`updateStatus via telegram failed: ${String(err)}`);
      await answer('Xatolik: e’lon topilmadi yoki o‘zgartirib bo‘lmadi');
      return;
    }

    const adminName = [cb.from?.first_name, cb.from?.last_name]
      .filter(Boolean)
      .join(' ');
    const verdict =
      action === 'approve' ? '✅ Tasdiqlandi' : '❌ Rad etildi';

    await answer(verdict);

    // Tugmali xabarni yakuniy holat bilan almashtiramiz (qayta bosilmasin)
    if (cb.message?.chat?.id && cb.message.message_id) {
      const original = cb.message.text ?? '';
      await this.call(config.token, 'editMessageText', {
        chat_id: cb.message.chat.id,
        message_id: cb.message.message_id,
        text: `${original}\n\n${verdict}${adminName ? ` — ${adminName}` : ''}`,
      }).catch(() => {});
    }
  }

  // ---- helpers ----

  private buildPropertyCaption(e: PropertyCreatedEvent): string {
    const price =
      e.price !== undefined && e.price !== null
        ? `${e.price.toLocaleString('en-US')} ${e.currency ?? ''}`.trim()
        : null;
    const author = [e.authorName, e.authorPhone].filter(Boolean).join(', ');
    const adminUrl = `${process.env.CLIENT_URL ?? ''}/admin/properties`;

    const lines = [
      '🏠 <b>Yangi e’lon — tasdiqlash kutmoqda</b>',
      '',
      e.title ? `📌 ${this.escape(e.title)}` : null,
      `🏷 Kategoriya: ${this.escape(e.category)}`,
      price ? `💰 Narx: ${this.escape(price)}` : null,
      e.bedrooms ? `🛏 Xonalar: ${e.bedrooms}` : null,
      e.address ? `📍 Manzil: ${this.escape(e.address)}` : null,
      author ? `👤 Egasi: ${this.escape(author)}` : null,
      '',
      `🔗 <a href="${adminUrl}">Admin panelda ko‘rish</a>`,
    ].filter((line): line is string => line !== null);

    return lines.join('\n').slice(0, MAX_CAPTION);
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private async sendMediaGroup(
    token: string,
    chatId: string,
    photos: string[],
    caption: string,
  ): Promise<void> {
    const media = photos.slice(0, MAX_PHOTOS).map((url, i) => ({
      type: 'photo' as const,
      media: url,
      // Caption faqat birinchi rasmga — Telegram media group qoidasi
      ...(i === 0 ? { caption, parse_mode: 'HTML' as const } : {}),
    }));

    try {
      await this.call(token, 'sendMediaGroup', { chat_id: chatId, media });
    } catch (err) {
      // Rasm URL'laridan biri yaroqsiz bo'lsa Telegram butun group'ni rad
      // etadi — hech bo'lmasa matnli xabar yetib borsin.
      this.logger.warn(`sendMediaGroup failed, fallback to text: ${String(err)}`);
      await this.call(token, 'sendMessage', {
        chat_id: chatId,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    }
  }

  private async call(
    token: string,
    method: string,
    body: unknown,
  ): Promise<void> {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Telegram API ${method} ${res.status}: ${detail}`);
    }
  }
}
