import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { TelegramAdminService } from './telegram-admin.service';

/**
 * Telegram bot webhook. Himoya: setWebhook'da berilgan secret_token —
 * Telegram har bir so'rovda X-Telegram-Bot-Api-Secret-Token header'ida
 * qaytaradi (tokendan sha256 orqali deterministik hosil qilinadi).
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('telegram')
export class TelegramWebhookController {
  constructor(private readonly service: TelegramAdminService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: Record<string, unknown>,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    if (!(await this.service.verifySecret(secret))) {
      throw new UnauthorizedException();
    }
    await this.service.handleUpdate(update);
    return { ok: true };
  }
}
