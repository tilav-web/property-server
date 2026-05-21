import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VoicePremiumService } from './voice-premium.service';
import { VoicePremiumController } from './voice-premium.controller';
import { VoiceUsage, VoiceUsageSchema } from './schemas/voice-usage.schema';
import { User, UserSchema } from '../user/user.schema';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VoiceUsage.name, schema: VoiceUsageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    SiteSettingsModule,
    PaymentModule,
    UserModule, // JwtModule re-exported (AuthGuard uchun)
  ],
  controllers: [VoicePremiumController],
  providers: [VoicePremiumService],
  exports: [VoicePremiumService],
})
export class VoicePremiumModule {}
