import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * BullMQ uchun bitta umumiy Redis ulanishi. Barcha navbatlar (masalan
 * property-counters) shu ulanishni ishlatadi — har biri alohida Redis
 * connection ochmaydi.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379',
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class BullRootModule {}
