import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './modules/file/file.module';
import { PropertyModule } from './modules/property/property.module';
import { MessageModule } from './modules/message/message.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { InquiryModule } from './modules/inquiry/inquiry.module';
import { AdvertiseModule } from './modules/advertise/advertise.module';
import { GenaiModule } from './modules/openai/openai.module';
import { AiPropertyModule } from './modules/ai-property/ai-property.module';
import { AdminModule } from './modules/admin/admin.module';
import { StatisticModule } from './modules/statistic/statistic.module';
import { TagModule } from './modules/tag/tag.module';
import { PropertySearchCacheModule } from './modules/property/property-search.cache';
import { NotificationModule } from './modules/notification/notification.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { ProjectModule } from './modules/project/project.module';
import { ProjectInquiryModule } from './modules/project-inquiry/project-inquiry.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
import { ExchangeRateModule } from './modules/exchange-rate/exchange-rate.module';
import { CountryConfigModule } from './common/config/country-config.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PropertyPremiumModule } from './modules/property-premium/property-premium.module';
import { AdminPaymentModule } from './modules/admin-payment/admin-payment.module';
import { PremiumModule } from './modules/premium/premium.module';
import { CommunityModule } from './modules/community/community.module';
import { ExpireCronModule } from './modules/expire-cron/expire-cron.module';
import { HealthModule } from './modules/health/health.module';
import { PushModule } from './modules/push/push.module';
import { AppVersionModule } from './modules/app-version/app-version.module';
import { TelegramAdminModule } from './modules/telegram/telegram-admin.module';
import { BullRootModule } from './common/queue/bull-root.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CountryConfigModule,
    // Global default: har bir IP uchun 1 daqiqada 120 so'rov. Eski qiymat
    // (ttl: 10, limit: 5) millisekundlarda hisoblangani uchun aslida
    // "10ms ichida 5 ta parallel so'rov" degani edi — bitta sahifa
    // yuklanganda brauzer osongina 5+ parallel so'rov yuboradi (property
    // ro'yxati + notification counter + favorites va h.k.), shu sabab
    // haqiqiy foydalanuvchilar tasodifiy 429 olar edi. Har bir route
    // o'zining @Throttle bilan buni qattiqroq qilib qo'yishi mumkin
    // (login, OTP, AI so'rovlar kabi haqiqatan himoya kerak joylarda).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    BullRootModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URL');
        if (!uri) {
          throw new Error('MONGODB_URL muhit o‘zgaruvchisi topilmadi');
        }
        return { uri, autoIndex: true };
      },
    }),
    PropertySearchCacheModule,
    UserModule,
    FileModule,
    PropertyModule,
    InteractionsModule,
    MessageModule,
    InquiryModule,
    AdvertiseModule,
    GenaiModule,
    AiPropertyModule,
    AdminModule,
    StatisticModule,
    TagModule,
    NotificationModule,
    ChatModule,
    AiChatModule,
    DeveloperModule,
    ProjectModule,
    ProjectInquiryModule,
    SiteSettingsModule,
    ExchangeRateModule,
    PaymentModule,
    PropertyPremiumModule,
    PremiumModule,
    CommunityModule,
    AdminPaymentModule,
    ExpireCronModule,
    HealthModule,
    PushModule,
    AppVersionModule,
    TelegramAdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 🔹 Global guard sifatida ishlaydi
    },
  ],
})
export class AppModule {}
