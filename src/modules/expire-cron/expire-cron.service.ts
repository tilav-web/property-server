import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdvertiseService } from '../advertise/advertise.service';
import { PropertyService } from '../property/property.service';
import { PremiumService } from '../premium/premium.service';

/**
 * Muddati tugagan ob'ektlarni kun bo'yi tozalovchi cron'lar.
 *
 * - Premium e'lonlar: `Property.is_premium_until < now` bo'lsa
 *   `is_premium = false` qilinadi
 * - Reklamalar: `Advertise.to < now` bo'lsa `status = EXPIRED` qilinadi
 *
 * Har kun mahalliy vaqt bo'yicha 03:00 da ishlaydi (server kam yuk paytida).
 */
@Injectable()
export class ExpireCronService {
  private readonly logger = new Logger(ExpireCronService.name);

  constructor(
    private readonly propertyService: PropertyService,
    private readonly advertiseService: AdvertiseService,
    private readonly premiumService: PremiumService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'expire-property-premium',
  })
  async expirePropertyPremium() {
    try {
      const count = await this.propertyService.expirePremiums();
      if (count > 0) {
        this.logger.log(`Expired property premium: ${count} ta e'lon`);
      }
    } catch (err) {
      this.logger.error(
        `expirePropertyPremium xato: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'expire-advertises',
  })
  async expireAdvertises() {
    try {
      const count = await this.advertiseService.expireOldAdvertises();
      if (count > 0) {
        this.logger.log(`Expired advertises: ${count} ta reklama`);
      }
    } catch (err) {
      this.logger.error(
        `expireAdvertises xato: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Premium endi-endi tugagan user'larga ogohlantirish: 7 kun ichida
   * ortiqcha property arxiv bo'lishi haqida bildirishnoma.
   * 03:10 da ishlaydi (boshqa cron'lardan keyin).
   */
  @Cron('10 3 * * *', { name: 'premium-grace-notify' })
  async notifyRecentlyExpiredPremium() {
    try {
      const sent = await this.premiumService.notifyRecentlyExpired();
      if (sent > 0) {
        this.logger.log(`Premium grace notifications sent: ${sent} ta user`);
      }
    } catch (err) {
      this.logger.error(
        `notifyRecentlyExpiredPremium xato: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Premium tugaganidan keyin 7+ kun o'tgan user'larning eng eski
   * ortiqcha property'larini avtomatik arxivlash.
   * 03:20 da ishlaydi.
   */
  @Cron('20 3 * * *', { name: 'premium-grace-archive' })
  async archiveExtrasForExpiredPremium() {
    try {
      const { affectedUsers, archivedProperties } =
        await this.premiumService.archiveExtrasForExpiredUsers();
      if (archivedProperties > 0) {
        this.logger.log(
          `Premium grace archive: ${archivedProperties} property, ${affectedUsers} user`,
        );
      }
    } catch (err) {
      this.logger.error(
        `archiveExtrasForExpiredPremium xato: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
