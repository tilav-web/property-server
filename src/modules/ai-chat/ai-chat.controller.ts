import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AiChatService } from './ai-chat.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { PremiumService } from '../premium/premium.service';

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
]);

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
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly premium: PremiumService,
  ) {}

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

  /**
   * Anonim voice AI suhbat. multipart/form-data:
   *  - audio: voice file (webm/ogg/mp3/m4a/wav)
   *  - history: optional JSON string [{role, content}, ...]
   *  - language: optional ISO 639-1 (en/ru/uz/ms)
   */
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('voice')
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Anonim ovozli AI suhbat (login talab qilinmaydi)',
  })
  @ApiStandardErrors({ validation: true, throttle: true, serverError: true })
  async askVoice(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { history?: string; language?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('audio file is required');
    }
    if (file.mimetype && !ACCEPTED_AUDIO_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported audio type: ${file.mimetype}`);
    }
    // Anonim — quota IP bo'yicha. Premium tekshirish anonim uchun yo'q.
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const quota = await this.premium.assertCanSendVoiceAndConsume({
      userId: null,
      ip,
    });

    let history: AnonymousMessage[] = [];
    if (typeof body.history === 'string' && body.history.trim()) {
      try {
        const parsed = JSON.parse(body.history) as unknown;
        if (Array.isArray(parsed)) {
          history = parsed.filter(
            (m): m is AnonymousMessage =>
              !!m &&
              typeof m === 'object' &&
              typeof (m as AnonymousMessage).content === 'string' &&
              ((m as AnonymousMessage).role === 'user' ||
                (m as AnonymousMessage).role === 'assistant'),
          );
        }
      } catch {
        throw new BadRequestException('history must be valid JSON array');
      }
    }
    const result = await this.aiChatService.processVoice({
      audio: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
      language: body.language,
      history,
    });
    return {
      ...result,
      quota: {
        isPremium: quota.isPremium,
        remainingToday: quota.remainingToday,
      },
    };
  }
}
