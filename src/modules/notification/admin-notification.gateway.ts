import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface AuthenticatedAdminSocket extends Socket {
  data: { adminId?: string };
}

interface AdminJwtPayload {
  _id: string;
  role?: string;
}

/**
 * Admin uchun real-time notification gateway.
 *
 * Namespace: `/admin-notifications`
 * Auth: `ADMIN_JWT_SECRET` bilan verify qilinadi (admin access_token)
 *
 * Connect:
 *   const socket = io('http://localhost:3000/admin-notifications', {
 *     auth: { token: adminAccessToken },
 *   });
 *
 * Server -> client eventlari (NotificationService tomonidan emit qilinadi):
 *   - 'notification:new'        { id, type, title, body, payload }
 *   - 'notification:unread'     { count }   // unread count yangilanishi
 */
@WebSocketGateway({
  namespace: '/admin-notifications',
  cors: {
    origin: (origin, cb) => cb(null, origin ?? true),
    credentials: true,
  },
})
export class AdminNotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AdminNotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: AuthenticatedAdminSocket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      this.logger.error('ADMIN_JWT_SECRET .env faylda topilmadi');
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<AdminJwtPayload>(token, {
        secret,
      });
      if (!payload?._id) throw new Error('Invalid payload');
      client.data.adminId = payload._id;
      client.join(this.adminRoom(payload._id));
      client.join(this.allAdminsRoom());
      this.logger.debug(`Admin ${payload._id} connected (${client.id})`);
    } catch (err) {
      this.logger.debug(`Connection rejected: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedAdminSocket) {
    if (client.data?.adminId) {
      this.logger.debug(
        `Admin ${client.data.adminId} disconnected (${client.id})`,
      );
    }
  }

  // ---- Helpers ----

  /** Bitta adminga event yuborish. */
  emitToAdmin(adminId: string, event: string, payload: unknown): void {
    this.server?.to(this.adminRoom(adminId)).emit(event, payload);
  }

  /** Barcha ulanagan adminlarga event yuborish. */
  emitToAllAdmins(event: string, payload: unknown): void {
    this.server?.to(this.allAdminsRoom()).emit(event, payload);
  }

  private adminRoom(adminId: string): string {
    return `admin:${adminId}`;
  }

  private allAdminsRoom(): string {
    return 'admins:all';
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
