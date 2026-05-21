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

export interface VoiceConfig {
  dailyFreeLimit: number;
  premiumPrice: number;
  premiumDurationDays: number;
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

export interface StartVoiceUpgradeResult {
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
export class VoicePremiumService implements ApprovalHandler {
  private readonly logger = new Logger(VoicePremiumService.name);

  constructor(
    @InjectModel(VoiceUsage.name)
    private readonly usageModel: Model<VoiceUsageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly siteSettings: SiteSettingsService,
    private readonly transactionService: TransactionService,
    private readonly countryConfig: CountryConfigService,
  ) {}

  /** Bugungi konfiguratsiya — SiteSettings'dan, mamlakat valyutasi bilan. */
  async getConfig(): Promise<VoiceConfig> {
    const settings = await this.siteSettings.get();
    return {
      dailyFreeLimit: settings.voice_daily_free_limit ?? 3,
      premiumPrice: settings.voice_premium_price ?? 0,
      premiumDurationDays: settings.voice_premium_duration_days ?? 30,
      currency: this.countryConfig.defaultCurrency,
    };
  }

  /** User premiumi amal qiladimi (key=null bo'lsa anonim). */
  async isPremiumActive(userId: string | null): Promise<{
    isPremium: boolean;
    until: Date | null;
  }> {
    if (!userId) return { isPremium: false, until: null };
    const user = await this.userModel
      .findById(userId)
      .select('voicePremiumUntil')
      .lean()
      .exec();
    const until = user?.voicePremiumUntil ?? null;
    if (!until) return { isPremium: false, until: null };
    const active = new Date(until).getTime() > Date.now();
    return { isPremium: active, until: active ? until : null };
  }

  /** Bugungi ishlatish soni. key = 'user:<id>' yoki 'ip:<addr>'. */
  async getUsageToday(key: string): Promise<number> {
    const doc = await this.usageModel
      .findOne({ key, day: ymd() })
      .lean()
      .exec();
    return doc?.count ?? 0;
  }

  /** Atomic increment — race condition'dan saqlanish uchun. */
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

  /**
   * Quota holatini qaytaradi va yuborish mumkinligini aytadi.
   * Premium bo'lsa cheksiz, aks holda dailyFreeLimit'gacha.
   */
  async getQuotaState(opts: {
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
        dailyFreeLimit: config.dailyFreeLimit,
        usedToday: 0,
        remainingToday: Number.POSITIVE_INFINITY,
        canSend: true,
      };
    }

    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const usedToday = await this.getUsageToday(key);
    const remainingToday = Math.max(0, config.dailyFreeLimit - usedToday);
    return {
      isPremium: false,
      premiumUntil: null,
      dailyFreeLimit: config.dailyFreeLimit,
      usedToday,
      remainingToday,
      canSend: remainingToday > 0,
    };
  }

  /**
   * Voice yuborishdan oldin chaqiriladi. Premium yoki limit yetarli bo'lsa —
   * o'tkazadi (premium uchun usage hisoblanmaydi). Limit tugagan bo'lsa —
   * 402 xato bilan tushuntirish bilan reject qiladi.
   */
  async assertCanSendAndConsume(opts: {
    userId: string | null;
    ip: string;
  }): Promise<{ isPremium: boolean; remainingToday: number }> {
    const state = await this.getQuotaState(opts);
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

  /** User uchun voice premium upgrade'ni boshlash — Payme URL qaytaradi. */
  async startUpgrade(userId: string): Promise<StartVoiceUpgradeResult> {
    const provider = this.resolveProvider();
    const config = await this.getConfig();
    if (config.premiumPrice <= 0) {
      throw new BadRequestException(
        'Voice premium narxi sozlanmagan. Admin SiteSettings\'da o\'rnatishi kerak.',
      );
    }

    const user = await this.userModel.findById(userId).select('_id').exec();
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const transaction = await this.transactionService.createPending({
      user: userId,
      orderType: OrderTypeEnum.VOICE_PREMIUM,
      orderId: userId, // orderId = User._id
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
   * orderId = User._id. voicePremiumUntil ni +durationDays ga uzaytiradi
   * (mavjud premium ustiga qo'shadi).
   */
  async activate(orderId: string): Promise<{ until: Date }> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('orderId noto\'g\'ri');
    }
    const config = await this.getConfig();
    const user = await this.userModel.findById(orderId).exec();
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const now = Date.now();
    const currentUntil = user.voicePremiumUntil
      ? new Date(user.voicePremiumUntil).getTime()
      : 0;
    const base = Math.max(now, currentUntil);
    const newUntil = new Date(
      base + config.premiumDurationDays * 24 * 60 * 60 * 1000,
    );
    user.voicePremiumUntil = newUntil;
    await user.save();
    this.logger.log(
      `Voice premium activated user=${orderId} until=${newUntil.toISOString()}`,
    );
    return { until: newUntil };
  }

  private resolveProvider(): PaymentProviderEnum {
    const raw = (process.env.PAYMENT_PROVIDER || 'payme').toLowerCase();
    if (raw === 'none') {
      throw new BadRequestException(
        'Bu mamlakatda online to\'lov mavjud emas (PAYMENT_PROVIDER=none)',
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
