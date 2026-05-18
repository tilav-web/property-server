import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Admin, AdminSchema } from '../admin/admin.schema';
import { AdminNotificationController } from './admin-notification.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
  ],
  providers: [NotificationService],
  controllers: [NotificationController, AdminNotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
