import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import {
  DeviceToken,
  DeviceTokenSchema,
} from './schemas/device-token.schema';
import {
  BroadcastNotification,
  BroadcastNotificationSchema,
} from './schemas/broadcast-notification.schema';
import { User, UserSchema } from '../user/user.schema';
import { Admin, AdminSchema } from '../admin/admin.schema';
import { PushTokenService } from './push-token.service';
import { FcmService } from './fcm.service';
import { PushTokenController } from './push-token.controller';
import { AdminPushController } from './admin-push.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: BroadcastNotification.name, schema: BroadcastNotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    JwtModule.register({}),
  ],
  providers: [PushTokenService, FcmService],
  controllers: [PushTokenController, AdminPushController],
  exports: [PushTokenService, FcmService],
})
export class PushModule {}
