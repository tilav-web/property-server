import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PropertyModule } from '../property/property.module';
import { PropertyPremiumController } from './property-premium.controller';
import { PropertyPremiumService } from './property-premium.service';

@Module({
  imports: [PaymentModule, PropertyModule],
  controllers: [PropertyPremiumController],
  providers: [PropertyPremiumService],
  exports: [PropertyPremiumService],
})
export class PropertyPremiumModule {}
