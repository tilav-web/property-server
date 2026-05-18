import { Module } from '@nestjs/common';
import { AdvertiseModule } from '../advertise/advertise.module';
import { PropertyModule } from '../property/property.module';
import { ExpireCronService } from './expire-cron.service';

@Module({
  imports: [PropertyModule, AdvertiseModule],
  providers: [ExpireCronService],
})
export class ExpireCronModule {}
