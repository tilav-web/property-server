import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppVersion, AppVersionSchema } from './app-version.schema';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { AdminAppVersionController } from './admin-app-version.controller';
import { PushModule } from '../push/push.module';
import {
  BroadcastNotification,
  BroadcastNotificationSchema,
} from '../push/schemas/broadcast-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppVersion.name, schema: AppVersionSchema },
      { name: BroadcastNotification.name, schema: BroadcastNotificationSchema },
    ]),
    PushModule,
  ],
  controllers: [AppVersionController, AdminAppVersionController],
  providers: [AppVersionService],
})
export class AppVersionModule {}
