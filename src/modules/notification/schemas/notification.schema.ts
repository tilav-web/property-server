import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationType } from '../enums/notification-type.enum';

export type NotificationDocument = HydratedDocument<Notification>;

/**
 * Notification kimga yuborilganini ajratish. Mavjud documentlar avtomatik
 * 'USER' deb qabul qilinadi (default).
 */
export type NotificationRecipientType = 'USER' | 'ADMIN';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  /**
   * Qabul qiluvchi ID. recipientType'ga qarab User._id yoki Admin._id.
   * Mongoose ref 'User' deb qoldirilgan (mavjud kod bilan moslik uchun) —
   * admin notification'larini populate qilmang.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER',
    index: true,
  })
  recipientType: NotificationRecipientType;

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  type: NotificationType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: String, required: false })
  link?: string;

  @Prop({ type: Object, required: false })
  payload?: Record<string, unknown>;

  @Prop({ type: Boolean, default: false, index: true })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ recipientType: 1, user: 1, read: 1, createdAt: -1 });
