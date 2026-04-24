import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

interface AuthenticatedSocket extends Socket {
  data: { userId?: string };
}

interface JwtPayload {
  _id: string;
  role?: string;
  tokenType?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin, cb) => cb(null, origin ?? true),
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.debug(`Connection rejected: no token (${client.id})`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (!payload?._id) throw new Error('Invalid payload');
      client.data.userId = payload._id;
      client.join(this.userRoom(payload._id));
      this.logger.debug(`User ${payload._id} connected (${client.id})`);
    } catch (err) {
      this.logger.debug(`Connection rejected: bad token (${String(err)})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data?.userId) {
      this.logger.debug(
        `User ${client.data.userId} disconnected (${client.id})`,
      );
    }
  }

  @SubscribeMessage('chat:subscribe')
  async onSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.conversationId) return { ok: false };
    try {
      // Authorize: must be participant
      await this.chatService.getConversation(userId, data.conversationId);
      client.join(this.conversationRoom(data.conversationId));
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('chat:unsubscribe')
  onUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(this.conversationRoom(data.conversationId));
    }
    return { ok: true };
  }

  @SubscribeMessage('chat:send')
  async onSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'unauthenticated' };

    const dto = plainToInstance(SendMessageDto, data ?? {});
    const errors = await validate(dto);
    if (errors.length) return { ok: false, error: 'invalid_payload' };

    try {
      const msg = await this.chatService.sendText(
        userId,
        dto.conversationId,
        dto.body,
      );
      return { ok: true, id: String(msg._id) };
    } catch (err) {
      this.logger.warn(`chat:send failed: ${String(err)}`);
      return { ok: false, error: 'send_failed' };
    }
  }

  @SubscribeMessage('chat:typing')
  onTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; typing: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.conversationId) return { ok: false };
    client
      .to(this.conversationRoom(data.conversationId))
      .emit('chat:typing', {
        conversationId: data.conversationId,
        userId,
        typing: Boolean(data.typing),
      });
    return { ok: true };
  }

  @SubscribeMessage('chat:mark_read')
  async onMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.conversationId) return { ok: false };
    try {
      await this.chatService.markRead(userId, data.conversationId);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  // --- Helpers used by ChatService ---

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(this.userRoom(userId)).emit(event, payload);
  }

  emitToConversation(
    conversationId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server
      ?.to(this.conversationRoom(conversationId))
      .emit(event, payload);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private conversationRoom(id: string): string {
    return `conversation:${id}`;
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = (client.handshake.auth as Record<string, string>)?.token;
    if (fromAuth) return fromAuth;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;
    return null;
  }
}
