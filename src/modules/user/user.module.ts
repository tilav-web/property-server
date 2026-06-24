import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.schema';
import { UserController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './guards/jwt.strategy';
import { MobileOAuthService } from './services/mobile-oauth.service';
import { OtpModule } from '../otp/otp.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { MailModule } from '../mailer/mail.module';
import { FileModule } from '../file/file.module';
import { SmsModule } from '../sms/sms.module';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { Like, LikeSchema } from '../interactions/schemas/like.schema';
import { Save, SaveSchema } from '../interactions/schemas/save.schema';
import { Notification, NotificationSchema } from '../notification/schemas/notification.schema';
import { DeviceToken, DeviceTokenSchema } from '../push/schemas/device-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: Property.name, schema: PropertySchema },
      { name: Like.name, schema: LikeSchema },
      { name: Save.name, schema: SaveSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),

    OtpModule,
    MailModule,
    FileModule,
    SmsModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
    MobileOAuthService,
  ],
  exports: [UserService, JwtModule],
})
export class UserModule {}
