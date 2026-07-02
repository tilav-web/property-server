import { Module } from '@nestjs/common';
import { TelegramAdminService } from './telegram-admin.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { PropertyModule } from '../property/property.module';

@Module({
  imports: [SiteSettingsModule, PropertyModule],
  controllers: [TelegramWebhookController],
  providers: [TelegramAdminService],
  exports: [TelegramAdminService],
})
export class TelegramAdminModule {}
