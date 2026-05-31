import { Module, forwardRef } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PropertyModule } from '../property/property.module';
import { PropertyPremiumController } from './property-premium.controller';
import { PropertyPremiumService } from './property-premium.service';

@Module({
  // PropertyModule -> ExchangeRateModule -> AdminModule -> PremiumModule ->
  // PropertyPremiumModule -> PropertyModule (cycle). forwardRef bilan chetlab
  // o'tamiz, aks holda PropertyModule undefined bo'lib qoladi.
  imports: [PaymentModule, forwardRef(() => PropertyModule)],
  controllers: [PropertyPremiumController],
  providers: [PropertyPremiumService],
  exports: [PropertyPremiumService],
})
export class PropertyPremiumModule {}
