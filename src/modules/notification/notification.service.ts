import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { NotificationType } from './enums/notification-type.enum';

export interface CreateNotificationInput {
  user: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    return this.model.create({
      user: input.user,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      payload: input.payload,
    });
  }

  async findForUser(
    userId: string,
    { before, limit = 20 }: { before?: string; limit?: number },
  ): Promise<{ items: NotificationDocument[]; nextCursor: string | null }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };
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
    const nextCursor = hasMore
      ? String(result[result.length - 1]._id)
      : null;

    return { items: result, nextCursor };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({
      user: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { $set: { read: true } },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model.updateMany(
      { user: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    );
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model.deleteOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });
  }
}
