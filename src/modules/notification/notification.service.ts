import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationRecipientType,
} from './schemas/notification.schema';
import { NotificationType } from './enums/notification-type.enum';
import { Admin, AdminDocument } from '../admin/admin.schema';

export interface CreateNotificationInput {
  user: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  payload?: Record<string, unknown>;
  /** Default 'USER'. Admin notification uchun 'ADMIN' bering. */
  recipientType?: NotificationRecipientType;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    return this.model.create({
      user: input.user,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      payload: input.payload,
      recipientType: input.recipientType ?? 'USER',
    });
  }

  /**
   * Barcha admin'larga bitta xabar yuboradi (har bir admin uchun alohida
   * document yaratadi). Yangi to'lov tasdiqlash uchun ishlatiladi.
   */
  async notifyAllAdmins(
    input: Omit<CreateNotificationInput, 'user' | 'recipientType'>,
  ): Promise<number> {
    const admins = await this.adminModel.find({}, { _id: 1 }).lean();
    if (admins.length === 0) {
      this.logger.warn('notifyAllAdmins: hech qanday admin topilmadi');
      return 0;
    }

    const docs = admins.map((admin) => ({
      user: admin._id,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      payload: input.payload,
      recipientType: 'ADMIN' as const,
      read: false,
    }));

    await this.model.insertMany(docs, { ordered: false });
    return docs.length;
  }

  async findForUser(
    userId: string,
    { before, limit = 20 }: { before?: string; limit?: number },
  ): Promise<{ items: NotificationDocument[]; nextCursor: string | null }> {
    return this.findForRecipient('USER', userId, { before, limit });
  }

  async findForAdmin(
    adminId: string,
    { before, limit = 20 }: { before?: string; limit?: number },
  ): Promise<{ items: NotificationDocument[]; nextCursor: string | null }> {
    return this.findForRecipient('ADMIN', adminId, { before, limit });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.unreadCountFor('USER', userId);
  }

  async unreadCountForAdmin(adminId: string): Promise<number> {
    return this.unreadCountFor('ADMIN', adminId);
  }

  async markRead(userId: string, id: string): Promise<void> {
    return this.markReadFor('USER', userId, id);
  }

  async markReadForAdmin(adminId: string, id: string): Promise<void> {
    return this.markReadFor('ADMIN', adminId, id);
  }

  async markAllRead(userId: string): Promise<void> {
    return this.markAllReadFor('USER', userId);
  }

  async markAllReadForAdmin(adminId: string): Promise<void> {
    return this.markAllReadFor('ADMIN', adminId);
  }

  async remove(userId: string, id: string): Promise<void> {
    return this.removeFor('USER', userId, id);
  }

  async removeForAdmin(adminId: string, id: string): Promise<void> {
    return this.removeFor('ADMIN', adminId, id);
  }

  // ---- privates ----

  private async findForRecipient(
    recipientType: NotificationRecipientType,
    recipientId: string,
    { before, limit = 20 }: { before?: string; limit?: number },
  ): Promise<{ items: NotificationDocument[]; nextCursor: string | null }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const filter: Record<string, unknown> = {
      user: new Types.ObjectId(recipientId),
      recipientType,
    };
    if (before && Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }

    const items = await this.model
      .find(filter)
      .sort({ _id: -1 })
      .limit(safeLimit + 1)
      .exec();

    const hasMore = items.length > safeLimit;
    const result = hasMore ? items.slice(0, safeLimit) : items;
    const nextCursor = hasMore ? String(result[result.length - 1]._id) : null;

    return { items: result, nextCursor };
  }

  private async unreadCountFor(
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number> {
    return this.model.countDocuments({
      user: new Types.ObjectId(recipientId),
      recipientType,
      read: false,
    });
  }

  private async markReadFor(
    recipientType: NotificationRecipientType,
    recipientId: string,
    id: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model.updateOne(
      {
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(recipientId),
        recipientType,
      },
      { $set: { read: true } },
    );
  }

  private async markAllReadFor(
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<void> {
    await this.model.updateMany(
      {
        user: new Types.ObjectId(recipientId),
        recipientType,
        read: false,
      },
      { $set: { read: true } },
    );
  }

  private async removeFor(
    recipientType: NotificationRecipientType,
    recipientId: string,
    id: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model.deleteOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(recipientId),
      recipientType,
    });
  }
}
