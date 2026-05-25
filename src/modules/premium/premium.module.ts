import { Module, OnApplicationBootstrap, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { VoiceUsage, VoiceUsageSchema } from './schemas/voice-usage.schema';
import { User, UserSchema } from '../user/user.schema';
import {
  Property,
  PropertySchema,
} from '../property/schemas/property.schema';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';
import { PropertyModule } from '../property/property.module';
import { PropertyService } from '../property/property.service';
import { PropertyPremiumModule } from '../property-premium/property-premium.module';
import { PropertyPremiumService } from '../property-premium/property-premium.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VoiceUsage.name, schema: VoiceUsageSchema },
      { name: User.name, schema: UserSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
    SiteSettingsModule,
    PaymentModule,
    UserModule, // JwtModule re-exported (AuthGuard uchun)
    forwardRef(() => PropertyModule),
    forwardRef(() => PropertyPremiumModule),
  ],
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule implements OnApplicationBootstrap {
  constructor(
    private readonly premium: PremiumService,
    private readonly propertyService: PropertyService,
    private readonly propertyPremium: PropertyPremiumService,
  ) {}

  /** PropertyService va PropertyPremiumService'ga PremiumService set qilamiz. */
  onApplicationBootstrap() {
    this.propertyService.premiumService = this.premium;
    this.propertyPremium.premiumService = this.premium;
  }
}
