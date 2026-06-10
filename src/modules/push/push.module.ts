import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import {
  DeviceToken,
  DeviceTokenSchema,
} from './schemas/device-token.schema';
import { PushTokenService } from './push-token.service';
import { FcmService } from './fcm.service';
import { PushTokenController } from './push-token.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceToken.name, schema: DeviceTokenSchema },
    ]),
    JwtModule.register({}),
  ],
  providers: [PushTokenService, FcmService],
  controllers: [PushTokenController],
  exports: [PushTokenService, FcmService],
})
export class PushModule {}
