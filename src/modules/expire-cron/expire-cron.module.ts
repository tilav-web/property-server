import { Module } from '@nestjs/common';
import { AdvertiseModule } from '../advertise/advertise.module';
import { PropertyModule } from '../property/property.module';
import { PremiumModule } from '../premium/premium.module';
import { ExpireCronService } from './expire-cron.service';

@Module({
  imports: [PropertyModule, AdvertiseModule, PremiumModule],
  providers: [ExpireCronService],
})
export class ExpireCronModule {}
