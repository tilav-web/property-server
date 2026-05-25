import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CountryConfigService } from 'src/common/config/country.config';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import { PaymentProviderEnum } from 'src/enums/payment-provider.enum';
import { generatePaymeUrl } from 'src/utils/generate-payme-url';
import { ApprovalHandler } from '../payment/services/payment-approval.service';
import { TransactionService } from '../payment/services/transaction.service';
import { PropertyService } from '../property/property.service';

export interface StartUpgradeParams {
  propertyId: string;
  userId: string;
}

export interface StartUpgradeResult {
  transactionId: string;
  amount: number;
  currency: string;
  durationDays: number;
  checkoutUrl: string;
  provider: PaymentProviderEnum;
}

/**
 * Property premium upgrade flow:
 *   1. user POST /properties/:id/upgrade-premium chaqiradi
 *   2. service Transaction yaratadi (PENDING) + Payme checkout URL qaytaradi
 *   3. user URL'ga o'tib to'laydi
 *   4. Payme webhook -> PerformTransaction -> Transaction SUCCESS + AWAITING
 *   5. admin /admins/payments approve qiladi -> Property.is_premium = true
 *      + is_premium_until = +30 kun
 */
@Injectable()
export class PropertyPremiumService implements ApprovalHandler {
  /**
   * PremiumService — lazy setter (circular dep). Agar user umumiy premium
   * bo'lsa, PROPERTY_PREMIUM narxiga chegirma qo'llaniladi.
   */
  premiumService?: {
    isPremiumActive: (
      userId: string,
    ) => Promise<{ isPremium: boolean; until: Date | null }>;
    getConfig: () => Promise<{
      propertyPremiumDiscountPercent: number;
    }>;
  };

  constructor(
    private readonly propertyService: PropertyService,
    private readonly transactionService: TransactionService,
    private readonly countryConfig: CountryConfigService,
  ) {}

  async startUpgrade({
    propertyId,
    userId,
  }: StartUpgradeParams): Promise<StartUpgradeResult> {
    const provider = this.resolveProvider();

    // Ega va eligible ekanligini tekshirish (premium hali yoqilmagan)
    await this.propertyService.ensureOwnedAndPremiumEligible({
      propertyId,
      userId,
    });

    let price = this.resolvePrice();
    const durationDays = this.resolveDurationDays();

    // Umumiy premium bo'lsa - chegirma qo'llaniladi
    if (this.premiumService) {
      const { isPremium } = await this.premiumService.isPremiumActive(userId);
      if (isPremium) {
        const { propertyPremiumDiscountPercent } =
          await this.premiumService.getConfig();
        const discount = Math.min(
          Math.max(propertyPremiumDiscountPercent ?? 0, 0),
          90,
        );
        if (discount > 0) {
          price = Math.round((price * (100 - discount)) / 100);
        }
      }
    }

    const transaction = await this.transactionService.createPending({
      user: userId,
      orderType: OrderTypeEnum.PROPERTY_PREMIUM,
      orderId: propertyId,
      amount: price,
      currency: this.countryConfig.defaultCurrency,
      provider,
    });

    const transactionId = String(transaction._id);
    const checkoutUrl = generatePaymeUrl({
      amount: price,
      orderId: transactionId,
    });

    return {
      transactionId,
      amount: price,
      currency: this.countryConfig.defaultCurrency,
      durationDays,
      checkoutUrl,
      provider,
    };
  }

  /**
   * ApprovalHandler implementatsiyasi — PaymentApprovalService tomonidan
   * orderType=PROPERTY_PREMIUM transaction approved bo'lganda chaqiriladi.
   * `orderId` = Property._id (string).
   */
  async activate(orderId: string) {
    return this.propertyService.markPremium({
      propertyId: orderId,
      durationDays: this.resolveDurationDays(),
    });
  }

  // ---- privates ----

  private resolveProvider(): PaymentProviderEnum {
    const raw = (process.env.PAYMENT_PROVIDER || 'payme').toLowerCase();
    if (raw === 'none') {
      throw new BadRequestException(
        "Bu mamlakatda online to'lov mavjud emas (PAYMENT_PROVIDER=none)",
      );
    }
    if (raw === 'payme') return PaymentProviderEnum.PAYME;
    if (raw === 'click') return PaymentProviderEnum.CLICK;
    throw new InternalServerErrorException(
      `Noma'lum PAYMENT_PROVIDER: ${raw}`,
    );
  }

  private resolvePrice(): number {
    const raw = process.env.PREMIUM_PRICE;
    const n = raw ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n) || n <= 0) {
      throw new InternalServerErrorException(
        "Premium narxi sozlanmagan (PREMIUM_PRICE env yo'q yoki noto'g'ri)",
      );
    }
    return n;
  }

  private resolveDurationDays(): number {
    const raw = process.env.PREMIUM_DURATION_DAYS;
    const n = raw ? Number(raw) : 30;
    return Number.isFinite(n) && n > 0 && n < 365 ? Math.floor(n) : 30;
  }
}
