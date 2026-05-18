import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiChatService } from './ai-chat.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

interface AnonymousMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnonymousChatDto {
  history: AnonymousMessage[];
}

@ApiTags('AI Chat')
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
  @ApiOperation({
    summary: 'Anonim AI suhbat (login talab qilinmaydi)',
    description:
      "History client tomonida saqlanadi va har so'rov bilan yuboriladi. Server'da hech narsa saqlanmaydi.",
  })
  @ApiStandardErrors({ validation: true, throttle: true, serverError: true })
  async ask(@Body() dto: AnonymousChatDto) {
    const history = Array.isArray(dto.history) ? dto.history : [];
    const reply = await this.aiChatService.generateAnonymousReply(history);
    return reply;
  }
}
