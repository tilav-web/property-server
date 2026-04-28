import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './modules/file/file.module';
import { PropertyModule } from './modules/property/property.module';
import { MessageModule } from './modules/message/message.module';
import { SellerModule } from './modules/seller/seller.module';
import { BankAccountModule } from './modules/bank-account/bank-account.module';
import { CommissionerModule } from './modules/commissioner/commissioner.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 10,
        limit: 5,
      },
    ]),
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
    SellerModule,
    BankAccountModule,
    CommissionerModule,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 🔹 Global guard sifatida ishlaydi
    },
  ],
})
export class AppModule {}
