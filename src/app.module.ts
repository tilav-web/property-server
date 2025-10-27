import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './modules/file/file.module';
import { PropertyModule } from './modules/property/property.module';
import { RegionModule } from './modules/region/region.module';
import { DistrictModule } from './modules/district/district.module';
import { MessageModule } from './modules/message/message.module';
import { SellerModule } from './modules/seller/seller.module';
import { BankAccountModule } from './modules/bank-account/bank-account.module';
import { CommissionerModule } from './modules/commissioner/commissioner.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { InquiryModule } from './modules/inquiry/inquiry.module';
import { StatisticModule } from './modules/statistic/statistic.module';
import { AdvertiseModule } from './modules/advertise/advertise.module';

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
        return { uri };
      },
    }),
    UserModule,
    FileModule,
    PropertyModule,
    RegionModule,
    DistrictModule,
    InteractionsModule,
    MessageModule,
    SellerModule,
    BankAccountModule,
    CommissionerModule,
    DistrictModule,
    InquiryModule,
    StatisticModule,
    AdvertiseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 🔹 Global guard sifatida ishlaydi
    },
  ],
})
export class AppModule {}
