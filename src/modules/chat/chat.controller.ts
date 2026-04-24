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
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageType } from './enums/message-type.enum';
import type { IRequestCustom } from 'src/interfaces/custom-request.interface';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async list(@Req() req: IRequestCustom) {
    return this.chatService.listForUser(String(req.user!._id));
  }

  @Get('unread-count')
  async unreadCount(@Req() req: IRequestCustom) {
    const count = await this.chatService.totalUnread(String(req.user!._id));
    return { count };
  }

  @Post('conversations')
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

    // Har safar yangi e'lon kontekstiga o'tganda PROPERTY_REFERENCE
    // system message yuboriladi. Shu bilan bitta chat ichida turli e'lonlar
    // bo'yicha muloqot tarixi aniq ko'rinadi.
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
  async get(@Req() req: IRequestCustom, @Param('id') id: string) {
    return this.chatService.getConversation(String(req.user!._id), id);
  }

  @Get('conversations/:id/messages')
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
  async send(@Req() req: IRequestCustom, @Body() dto: SendMessageDto) {
    const msg = await this.chatService.sendText(
      String(req.user!._id),
      dto.conversationId,
      dto.body,
    );
    return { _id: String(msg._id), ok: true };
  }

  @Patch('conversations/:id/read')
  async markRead(@Req() req: IRequestCustom, @Param('id') id: string) {
    await this.chatService.markRead(String(req.user!._id), id);
    return { ok: true };
  }
}
