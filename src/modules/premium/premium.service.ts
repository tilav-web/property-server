import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CountryConfigService } from 'src/common/config/country.config';
import { CurrencyCode } from 'src/common/currencies/currency.enum';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import { PaymentProviderEnum } from 'src/enums/payment-provider.enum';
import { generatePaymeUrl } from 'src/utils/generate-payme-url';
import { ApprovalHandler } from '../payment/services/payment-approval.service';
import { TransactionService } from '../payment/services/transaction.service';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { User, UserDocument } from '../user/user.schema';
import { VoiceUsage, VoiceUsageDocument } from './schemas/voice-usage.schema';

export interface PremiumConfig {
  voiceDailyFreeLimit: number;
  freePropertyLimit: number;
  premiumPrice: number;
  premiumDurationDays: number;
  propertyPremiumDiscountPercent: number;
  currency: CurrencyCode;
}

export interface VoiceQuotaState {
  isPremium: boolean;
  premiumUntil: Date | null;
  dailyFreeLimit: number;
  usedToday: number;
  remainingToday: number;
  canSend: boolean;
}

export interface PropertyLimitState {
  isPremium: boolean;
  premiumUntil: Date | null;
  freeLimit: number;
  currentCount: number;
  canCreate: boolean;
}

export interface StartUpgradeResult {
  transactionId: string;
  amount: number;
  currency: CurrencyCode;
  durationDays: number;
  checkoutUrl: string;
  provider: PaymentProviderEnum;
}

function ymd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class PremiumService implements ApprovalHandler {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    @InjectModel(VoiceUsage.name)
    private readonly usageModel: Model<VoiceUsageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly siteSettings: SiteSettingsService,
    private readonly transactionService: TransactionService,
    private readonly countryConfig: CountryConfigService,
  ) {}

  // ============================================================================
  // Config
  // ============================================================================

  async getConfig(): Promise<PremiumConfig> {
    const settings = await this.siteSettings.get();
    // Backwards compat: agar premium_price=0 va voice_premium_price>0 bo'lsa,
    // eski qiymatdan foydalanamiz (migration paytida)
    const price = settings.premium_price
      ? settings.premium_price
      : (settings.voice_premium_price ?? 50000);
    const durationDays = settings.premium_duration_days
      ? settings.premium_duration_days
      : (settings.voice_premium_duration_days ?? 30);

    return {
      voiceDailyFreeLimit: settings.voice_daily_free_limit ?? 3,
      freePropertyLimit: settings.free_property_limit ?? 3,
      premiumPrice: price,
      premiumDurationDays: durationDays,
      propertyPremiumDiscountPercent:
        settings.premium_property_discount_percent ?? 50,
      currency: this.countryConfig.defaultCurrency,
    };
  }

  // ============================================================================
  // Premium status
  // ============================================================================

  /**
   * User'ning umumiy premiumi amal qiladimi.
   * Backwards compat: premiumUntil yoki eski voicePremiumUntil — qaysi keyinroq
   * bo'lsa o'sha ishlatiladi.
   */
  async isPremiumActive(userId: string | null): Promise<{
    isPremium: boolean;
    until: Date | null;
  }> {
    if (!userId) return { isPremium: false, until: null };
    const user = await this.userModel
      .findById(userId)
      .select('premiumUntil voicePremiumUntil')
      .lean()
      .exec();
    if (!user) return { isPremium: false, until: null };
    const candidates = [user.premiumUntil, user.voicePremiumUntil]
      .filter((d): d is Date => Boolean(d))
      .map((d) => new Date(d).getTime());
    if (candidates.length === 0) return { isPremium: false, until: null };
    const max = Math.max(...candidates);
    if (max <= Date.now()) return { isPremium: false, until: null };
    return { isPremium: true, until: new Date(max) };
  }

  // ============================================================================
  // Voice quota
  // ============================================================================

  async getUsageToday(key: string): Promise<number> {
    const doc = await this.usageModel
      .findOne({ key, day: ymd() })
      .lean()
      .exec();
    return doc?.count ?? 0;
  }

  async incrementUsage(key: string): Promise<number> {
    const day = ymd();
    const updated = await this.usageModel
      .findOneAndUpdate(
        { key, day },
        { $inc: { count: 1 }, $setOnInsert: { key, day } },
        { upsert: true, new: true },
      )
      .exec();
    return updated.count;
  }

  async getVoiceQuotaState(opts: {
    userId: string | null;
    ip: string;
  }): Promise<VoiceQuotaState> {
    const { userId, ip } = opts;
    const { isPremium, until } = await this.isPremiumActive(userId);
    const config = await this.getConfig();

    if (isPremium) {
      return {
        isPremium: true,
        premiumUntil: until,
        dailyFreeLimit: config.voiceDailyFreeLimit,
        usedToday: 0,
        remainingToday: Number.POSITIVE_INFINITY,
        canSend: true,
      };
    }

    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const usedToday = await this.getUsageToday(key);
    const remainingToday = Math.max(
      0,
      config.voiceDailyFreeLimit - usedToday,
    );
    return {
      isPremium: false,
      premiumUntil: null,
      dailyFreeLimit: config.voiceDailyFreeLimit,
      usedToday,
      remainingToday,
      canSend: remainingToday > 0,
    };
  }

  async assertCanSendVoiceAndConsume(opts: {
    userId: string | null;
    ip: string;
  }): Promise<{ isPremium: boolean; remainingToday: number }> {
    const state = await this.getVoiceQuotaState(opts);
    if (state.isPremium) {
      return { isPremium: true, remainingToday: Number.POSITIVE_INFINITY };
    }
    if (!state.canSend) {
      throw new VoiceQuotaExceededException(
        state.dailyFreeLimit,
        state.usedToday,
      );
    }
    const key = opts.userId ? `user:${opts.userId}` : `ip:${opts.ip}`;
    const newCount = await this.incrementUsage(key);
    return {
      isPremium: false,
      remainingToday: Math.max(0, state.dailyFreeLimit - newCount),
    };
  }

  // ============================================================================
  // Property limit
  // ============================================================================

  /**
   * Property yaratish/tahrirlash uchun tekshiruv.
   * Premium bo'lsa o'tkazadi. Aks holda mavjud count <= free_property_limit
   * bo'lishi kerak.
   *
   * countResolver — joriy property sonni qaytaradi (lazy: faqat kerak bo'lsa
   * chaqiriladi, premium user'lar uchun DB so'rovi kerak emas).
   */
  async getPropertyLimitState(
    userId: string,
    currentCount: number,
  ): Promise<PropertyLimitState> {
    const { isPremium, until } = await this.isPremiumActive(userId);
    const config = await this.getConfig();
    if (isPremium) {
      return {
        isPremium: true,
        premiumUntil: until,
        freeLimit: config.freePropertyLimit,
        currentCount,
        canCreate: true,
      };
    }
    return {
      isPremium: false,
      premiumUntil: null,
      freeLimit: config.freePropertyLimit,
      currentCount,
      canCreate: currentCount < config.freePropertyLimit,
    };
  }

  async assertCanCreateProperty(
    userId: string,
    currentCount: number,
  ): Promise<void> {
    const state = await this.getPropertyLimitState(userId, currentCount);
    if (!state.canCreate) {
      throw new PropertyLimitExceededException(
        state.freeLimit,
        state.currentCount,
      );
    }
  }

  // ============================================================================
  // Upgrade
  // ============================================================================

  async startUpgrade(userId: string): Promise<StartUpgradeResult> {
    const provider = this.resolveProvider();
    const config = await this.getConfig();
    if (config.premiumPrice <= 0) {
      throw new BadRequestException(
        "Premium narxi sozlanmagan. Admin SiteSettings'da o'rnatishi kerak.",
      );
    }

    const user = await this.userModel.findById(userId).select('_id').exec();
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const transaction = await this.transactionService.createPending({
      user: userId,
      orderType: OrderTypeEnum.PREMIUM,
      orderId: userId,
      amount: config.premiumPrice,
      currency: config.currency,
      provider,
    });

    const transactionId = String(transaction._id);
    const checkoutUrl = generatePaymeUrl({
      amount: config.premiumPrice,
      orderId: transactionId,
    });

    return {
      transactionId,
      amount: config.premiumPrice,
      currency: config.currency,
      durationDays: config.premiumDurationDays,
      checkoutUrl,
      provider,
    };
  }

  /**
   * ApprovalHandler — admin tasdiqlaganda chaqiriladi.
   * Ham PREMIUM, ham eski VOICE_PREMIUM uchun ishlatiladi (legacy compat).
   */
  async activate(orderId: string): Promise<{ until: Date }> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException("orderId noto'g'ri");
    }
    const config = await this.getConfig();
    const user = await this.userModel.findById(orderId).exec();
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const now = Date.now();
    // premiumUntil yoki eski voicePremiumUntil — qaysi keyinroq
    const candidates = [user.premiumUntil, user.voicePremiumUntil]
      .filter((d): d is Date => Boolean(d))
      .map((d) => new Date(d).getTime());
    const currentUntil = candidates.length ? Math.max(...candidates) : 0;
    const base = Math.max(now, currentUntil);
    const newUntil = new Date(
      base + config.premiumDurationDays * 24 * 60 * 60 * 1000,
    );
    user.premiumUntil = newUntil;
    await user.save();
    this.logger.log(
      `Premium activated user=${orderId} until=${newUntil.toISOString()}`,
    );
    return { until: newUntil };
  }

  // ============================================================================

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
}

export class VoiceQuotaExceededException extends HttpException {
  constructor(dailyLimit: number, usedToday: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'voice_quota_exceeded',
        message: `Voice bepul kunlik limit (${dailyLimit}) tugadi. Premium oling.`,
        dailyLimit,
        usedToday,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class PropertyLimitExceededException extends HttpException {
  constructor(freeLimit: number, currentCount: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'property_limit_exceeded',
        message: `Bepul foydalanuvchilar uchun e'lon limiti (${freeLimit}) to'ldi. Premium oling.`,
        freeLimit,
        currentCount,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
