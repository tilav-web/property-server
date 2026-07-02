import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

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

/**
 * Super admin uchun Telegram xabarnomalar.
 *
 * ENV:
 *   TELEGRAM_BOT_TOKEN     — BotFather'dan olingan token
 *   TELEGRAM_ADMIN_CHAT_ID — xabar boradigan chat (vergul bilan bir nechta ham mumkin)
 *
 * Token yoki chat_id bo'lmasa servis o'chirilgan hisoblanadi — property
 * yaratish oqimiga hech qanday ta'sir qilmaydi (event listener, throw yo'q).
 */
@Injectable()
export class TelegramAdminService {
  private readonly logger = new Logger(TelegramAdminService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  private readonly chatIds = (process.env.TELEGRAM_ADMIN_CHAT_ID ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  private get enabled(): boolean {
    return Boolean(this.token) && this.chatIds.length > 0;
  }

  @OnEvent('property.created', { async: true })
  async onPropertyCreated(event: PropertyCreatedEvent): Promise<void> {
    if (!this.enabled) return;

    const caption = this.buildCaption(event);
    for (const chatId of this.chatIds) {
      try {
        if (event.photos.length > 0) {
          await this.sendMediaGroup(chatId, event.photos, caption);
        } else {
          await this.sendMessage(chatId, caption);
        }
      } catch (err) {
        this.logger.warn(
          `Telegram notification failed (chat=${chatId}): ${String(err)}`,
        );
      }
    }
  }

  private buildCaption(e: PropertyCreatedEvent): string {
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
      await this.call('sendMediaGroup', { chat_id: chatId, media });
    } catch (err) {
      // Rasm URL'laridan biri yaroqsiz bo'lsa Telegram butun group'ni rad
      // etadi — hech bo'lmasa matnli xabar yetib borsin.
      this.logger.warn(`sendMediaGroup failed, fallback to text: ${String(err)}`);
      await this.sendMessage(chatId, caption);
    }
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }

  private async call(method: string, body: unknown): Promise<void> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.token}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Telegram API ${method} ${res.status}: ${detail}`);
    }
  }
}
