import { Module } from '@nestjs/common';
import { EskizClient } from './eskiz.client';
import { SmsService } from './sms.service';

@Module({
  providers: [EskizClient, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
