import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from './schemas/chat-message.schema';
import { MessageType } from './enums/message-type.enum';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { ChatGateway } from './chat.gateway';

interface SystemMessageInput {
  conversationId: string | Types.ObjectId;
  senderId: string | Types.ObjectId;
  type: MessageType;
  body: string;
  metadata?: Record<string, unknown>;
}

const SNIPPET_MAX = 80;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly gateway: ChatGateway,
  ) {}

  async findOrCreateConversation(
    userA: string,
    userB: string,
    propertyId?: string,
  ): Promise<ConversationDocument> {
    if (userA === userB) {
      throw new BadRequestException(
        'Conversation with yourself is not allowed',
      );
    }
    const a = new Types.ObjectId(userA);
    const b = new Types.ObjectId(userB);

    let conversation = await this.conversationModel
      .findOne({
        participants: { $all: [a, b] },
      })
      .exec();

    if (!conversation) {
      conversation = await this.conversationModel.create({
        participants: [a, b],
        property: propertyId ? new Types.ObjectId(propertyId) : undefined,
        lastMessageAt: new Date(),
        lastMessageSnippet: '',
        unreadBy: new Map(),
      });
    } else if (propertyId && !conversation.property) {
      conversation.property = new Types.ObjectId(propertyId);
      await conversation.save();
    }

    return conversation;
  }

  async listForUser(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'first_name last_name email avatar')
      .populate('property', 'title photos price currency')
      .lean()
      .exec() as unknown as ConversationDocument[];
  }

  async getConversation(
    userId: string,
    id: string,
  ): Promise<ConversationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Conversation not found');
    }
    const conv = await this.conversationModel
      .findById(id)
      .populate('participants', 'first_name last_name email avatar')
      .populate('property', 'title photos price currency')
      .exec();
    if (!conv) throw new NotFoundException('Conversation not found');
    if (!this.isParticipant(conv, userId)) {
      throw new ForbiddenException('Not a participant of this conversation');
    }
    return conv;
  }

  async listMessages(
    userId: string,
    conversationId: string,
    { before, limit = 30 }: { before?: string; limit?: number },
  ): Promise<{ items: ChatMessageDocument[]; nextCursor: string | null }> {
    const conv = await this.getConversation(userId, conversationId);

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const filter: Record<string, unknown> = { conversation: conv._id };
    if (before && Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }

    const items = await this.messageModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(safeLimit + 1)
      .lean()
      .exec();

    const hasMore = items.length > safeLimit;
    const result = hasMore ? items.slice(0, safeLimit) : items;
    const nextCursor = hasMore
      ? String(result[result.length - 1]._id)
      : null;

    return {
      items: result.reverse() as unknown as ChatMessageDocument[],
      nextCursor,
    };
  }

  async sendText(
    senderId: string,
    conversationId: string,
    body: string,
  ): Promise<ChatMessageDocument> {
    const conv = await this.getConversation(senderId, conversationId);
    return this.appendMessage(conv, {
      senderId,
      type: MessageType.TEXT,
      body,
    });
  }

  async createSystemMessage(input: SystemMessageInput): Promise<ChatMessageDocument> {
    const conv = await this.conversationModel
      .findById(input.conversationId)
      .exec();
    if (!conv) throw new NotFoundException('Conversation not found');
    return this.appendMessage(conv, {
      senderId: String(input.senderId),
      type: input.type,
      body: input.body,
      metadata: input.metadata,
    });
  }

  async markRead(userId: string, conversationId: string): Promise<void> {
    const conv = await this.getConversation(userId, conversationId);
    if ((conv.unreadBy?.get(userId) ?? 0) === 0) return;

    conv.unreadBy.set(userId, 0);
    await conv.save();

    // Mark recent messages as read by this user
    await this.messageModel.updateMany(
      {
        conversation: conv._id,
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      { $addToSet: { readBy: new Types.ObjectId(userId) } },
    );

    this.gateway.emitToUser(userId, 'chat:read_receipt', {
      conversationId: String(conv._id),
      userId,
    });

    // Also notify the peer so their UI can mark delivered→read
    const peer = this.peerOf(conv, userId);
    if (peer) {
      this.gateway.emitToUser(peer, 'chat:read_receipt', {
        conversationId: String(conv._id),
        userId,
      });
    }
  }

  async totalUnread(userId: string): Promise<number> {
    const convs = await this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .select('unreadBy')
      .lean()
      .exec();
    return convs.reduce((acc, c) => {
      const v = (c.unreadBy as unknown as Record<string, number>) ?? {};
      return acc + (v[userId] ?? 0);
    }, 0);
  }

  private async appendMessage(
    conv: ConversationDocument,
    {
      senderId,
      type,
      body,
      metadata,
    }: {
      senderId: string;
      type: MessageType;
      body: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<ChatMessageDocument> {
    const sender = new Types.ObjectId(senderId);
    const message = await this.messageModel.create({
      conversation: conv._id,
      sender,
      type,
      body,
      metadata,
      readBy: [sender],
    });

    const snippet = this.makeSnippet(type, body);
    conv.lastMessageAt = new Date();
    conv.lastMessageSnippet = snippet;

    const peer = this.peerOf(conv, senderId);
    if (peer) {
      const prev = conv.unreadBy?.get(peer) ?? 0;
      conv.unreadBy.set(peer, prev + 1);
    }
    await conv.save();

    const payload = this.serializeMessage(message, conv);

    // Real-time push: both participants (sender's other tabs + peer)
    this.gateway.emitToConversation(String(conv._id), 'chat:new_message', payload);
    if (peer) this.gateway.emitToUser(peer, 'chat:new_message', payload);
    this.gateway.emitToUser(senderId, 'chat:new_message', payload);

    // Notification for the recipient only
    if (peer) {
      try {
        await this.notificationService.create({
          user: peer,
          type:
            type === MessageType.PRICE_OFFER
              ? NotificationType.PRICE_OFFER
              : NotificationType.NEW_MESSAGE,
          title:
            type === MessageType.PRICE_OFFER
              ? 'New price offer'
              : 'New message',
          body: snippet,
          link: `/messages?c=${String(conv._id)}`,
          payload: { conversationId: String(conv._id) },
        });
        this.gateway.emitToUser(peer, 'notification:new', {
          type,
          conversationId: String(conv._id),
        });
      } catch (err) {
        this.logger.warn(`Notification create failed: ${String(err)}`);
      }
    }

    return message;
  }

  private makeSnippet(type: MessageType, body: string): string {
    const prefix =
      type === MessageType.PRICE_OFFER
        ? '💰 '
        : type === MessageType.PROPERTY_REFERENCE
          ? '🏠 '
          : '';
    const snippet = `${prefix}${body}`.trim();
    return snippet.length > SNIPPET_MAX
      ? snippet.slice(0, SNIPPET_MAX - 1) + '…'
      : snippet;
  }

  private isParticipant(
    conv: ConversationDocument,
    userId: string,
  ): boolean {
    return conv.participants.some((p) => String(p) === userId);
  }

  private peerOf(
    conv: ConversationDocument,
    userId: string,
  ): string | null {
    const peer = conv.participants.find((p) => String(p) !== userId);
    return peer ? String(peer) : null;
  }

  private serializeMessage(
    message: ChatMessageDocument,
    conv: ConversationDocument,
  ) {
    return {
      _id: String(message._id),
      conversation: String(conv._id),
      sender: String(message.sender),
      type: message.type,
      body: message.body,
      metadata: message.metadata ?? null,
      readBy: message.readBy.map((id) => String(id)),
      createdAt: message.createdAt,
    };
  }
}
