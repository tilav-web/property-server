import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiChatService } from './ai-chat.service';

interface AnonymousMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnonymousChatDto {
  history: AnonymousMessage[];
}

@Controller('chat/ai-anonymous')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  /**
   * Anonim AI suhbat — login bo'lmagan foydalanuvchi uchun.
   * History client tomonida saqlanadi (localStorage / state) va har so'rov
   * bilan yuboriladi. Server'da hech narsa saqlanmaydi.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  async ask(@Body() dto: AnonymousChatDto) {
    const history = Array.isArray(dto.history) ? dto.history : [];
    const reply = await this.aiChatService.generateAnonymousReply(history);
    return reply;
  }
}
