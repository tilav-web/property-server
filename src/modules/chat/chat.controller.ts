import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageType } from './enums/message-type.enum';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';
import { UserService } from '../user/user.service';
import { ApiStandardErrors } from 'src/common/swagger/api-errors.decorator';

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

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Conversation’ni o‘qilgan deb belgilash' })
  @ApiStandardErrors({ auth: true, notFound: true })
  async markRead(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.chatService.markRead(String(req.user!._id), id);
    return { ok: true };
  }
}
