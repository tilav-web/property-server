import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Admin, AdminSchema } from '../admin/admin.schema';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminNotificationGateway } from './admin-notification.gateway';
import { PushModule } from '../push/push.module';
import {
  BroadcastNotification,
  BroadcastNotificationSchema,
} from '../push/schemas/broadcast-notification.schema';
import { User, UserSchema } from '../user/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: BroadcastNotification.name, schema: BroadcastNotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // JwtModule — AdminNotificationGateway admin token verify qiladi
    // (secret runtime'da process.env.ADMIN_JWT_SECRET orqali olinadi)
    JwtModule.register({}),
    PushModule,
  ],
  providers: [NotificationService, AdminNotificationGateway],
  controllers: [NotificationController, AdminNotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
