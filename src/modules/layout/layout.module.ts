import { Module } from '@nestjs/common';
import { LayoutController } from './layout.controller';
import { LayoutService } from './layout.service';
import { PropertyModule } from '../property/property.module';
import { AdvertiseModule } from '../advertise/advertise.module';

@Module({
  imports: [PropertyModule, AdvertiseModule],
  controllers: [LayoutController],
  providers: [LayoutService],
})
export class LayoutModule {}
