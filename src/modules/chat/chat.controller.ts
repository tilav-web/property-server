import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageType } from './enums/message-type.enum';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { UserService } from '../user/user.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';
import { AiChatService } from '../ai-chat/ai-chat.service';
import { VoicePremiumService } from '../voice-premium/voice-premium.service';

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
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

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearer')
@ApiCookieAuth('access_token')
@ApiTags('Chat')
@ApiStandardErrors({ auth: true })
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AiChatService))
    private readonly aiChatService: AiChatService,
    private readonly voicePremium: VoicePremiumService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Mening conversation’larim ro‘yxati' })
  async list(@Req() req: IRequestCustom) {
    return this.chatService.listForUser(String(req.user!._id));
  }

  /**
   * AI yordamchi bilan suhbatni topadi yoki yaratadi va to'liq qaytaradi.
   * Header'dagi tezkor tugmadan va alohida /ai-chat sahifadan ishlatiladi.
   */
  @Get('ai-conversation')
  @ApiOperation({
    summary: 'AI yordamchi bilan conversation’ni olish/yaratish',
  })
  async aiConversation(@Req() req: IRequestCustom) {
    const me = String(req.user!._id);
    const aiUserId = await this.userService.getAiAgentId();
    const { conversation } = await this.chatService.findOrCreateConversation(
      me,
      aiUserId,
    );
    return this.chatService.getConversation(me, String(conversation._id));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'O‘qilmagan xabarlar soni' })
  async unreadCount(@Req() req: IRequestCustom) {
    const count = await this.chatService.totalUnread(String(req.user!._id));
    return { count };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Conversation yaratish yoki mavjudini olish' })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  async createOrGet(
    @Req() req: IRequestCustom,
    @Body() dto: CreateConversationDto,
  ) {
    const me = String(req.user!._id);
    const { conversation, propertyContextChanged } =
      await this.chatService.findOrCreateConversation(
        me,
        dto.peerUserId,
        dto.propertyId,
      );

    if (dto.propertyId && propertyContextChanged) {
      await this.chatService.createSystemMessage({
        conversationId: conversation._id,
        senderId: me,
        type: MessageType.PROPERTY_REFERENCE,
        body: 'Shu e’lon bo‘yicha suhbat boshlandi',
        metadata: { propertyId: dto.propertyId },
      });
    }

    if (dto.initialMessage) {
      await this.chatService.sendText(
        me,
        String(conversation._id),
        dto.initialMessage,
      );
    }

    return this.chatService.getConversation(me, String(conversation._id));
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Conversation tafsiloti' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async get(@Req() req: IRequestCustom, @Param('id') id: string) {
    return this.chatService.getConversation(String(req.user!._id), id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Conversation xabarlari (paginatsiya before+limit)',
  })
  @ApiStandardErrors({ auth: true, notFound: true })
  async messages(
    @Req() req: IRequestCustom,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.listMessages(String(req.user!._id), id, {
      before,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Post('messages')
  @ApiOperation({ summary: 'Xabar yuborish' })
  @ApiStandardErrors({ auth: true, validation: true, notFound: true })
  async send(@Req() req: IRequestCustom, @Body() dto: SendMessageDto) {
    const msg = await this.chatService.sendText(
      String(req.user!._id),
      dto.conversationId,
      dto.body,
    );
    return { _id: String(msg._id), ok: true };
  }

  /**
   * Authenticated voice message: faqat AI conversation uchun.
   * Multipart: audio (file), language (optional).
   */
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('conversations/:id/voice')
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'AI suhbatga voice xabar yuborish' })
  @ApiStandardErrors({
    auth: true,
    validation: true,
    notFound: true,
    throttle: true,
  })
  async sendVoice(
    @Req() req: IRequestCustom,
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { language?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('audio file is required');
    }
    if (file.mimetype && !ACCEPTED_AUDIO_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported audio type: ${file.mimetype}`);
    }

    const me = String(req.user!._id);
    // Faqat AI conversation'da voice ruxsat etamiz — boshqasi shartmas
    const conv = await this.chatService.getConversation(me, conversationId);
    const aiUserId = await this.userService.getAiAgentId();
    const isAiConversation = conv.participants.some((p) => {
      const id = typeof p === 'object' && p && '_id' in p
        ? String((p as { _id: unknown })._id)
        : String(p);
      return id === aiUserId;
    });
    if (!isAiConversation) {
      throw new BadRequestException(
        'Voice messages are only supported in AI conversations',
      );
    }

    // Auth user uchun quota — premium bo'lsa cheksiz, aks holda kunlik limit
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const quota = await this.voicePremium.assertCanSendAndConsume({
      userId: me,
      ip,
    });

    const result = await this.aiChatService.processAuthenticatedVoice({
      conversationId,
      senderId: me,
      audio: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
      language: body.language,
    });
    return {
      ok: true,
      ...result,
      quota: {
        isPremium: quota.isPremium,
        remainingToday: quota.remainingToday,
      },
    };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Conversation’ni o‘qilgan deb belgilash' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async markRead(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.chatService.markRead(String(req.user!._id), id);
    return { ok: true };
  }
}
