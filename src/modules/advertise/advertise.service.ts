import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Advertise, AdvertiseDocument } from './advertise.schema';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { FileService } from '../file/file.service';
import { EnumAdvertiseStatus } from 'src/enums/advertise-status.enum';
import { EnumAdvertiseType } from 'src/enums/advertise-type.enum';
import { EnumPaymentStatus } from 'src/enums/advertise-payment-status.enum';
import { EnumFilesFolder } from '../file/enums/files-folder.enum';
import { UpdateAdvertiseDto } from './dto/update-advertise.dto';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
} from 'src/common/currencies';
import { TransactionService } from '../payment/services/transaction.service';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import { PaymentProviderEnum } from 'src/enums/payment-provider.enum';
import { generatePaymeUrl } from 'src/utils/generate-payme-url';
import { ApprovalHandler } from '../payment/services/payment-approval.service';

export interface CreateAdvertiseResult {
  advertise: AdvertiseDocument;
  /** PAYMENT_PROVIDER=none bo'lsa null (Malaysia uchun — admin qo'lda paid qiladi). */
  transactionId: string | null;
  /** PAYMENT_PROVIDER=none bo'lsa null. */
  checkoutUrl: string | null;
  provider: PaymentProviderEnum | 'NONE';
}

/**
 * Reklama yaratish va to'lov flow:
 *
 * PAYMENT_PROVIDER=payme (UZ):
 *   1. Advertise yaratiladi (PENDING, payment_status: PENDING)
 *   2. Transaction yaratiladi va Payme checkout URL qaytariladi
 *   3. User Payme'da to'laydi -> webhook -> Transaction SUCCESS + AWAITING
 *   4. Admin approve -> activate(advertiseId):
 *      payment_status = PAID, status = APPROVED, from = now, to = now + days
 *
 * PAYMENT_PROVIDER=none (MY):
 *   1. Advertise yaratiladi (PENDING)
 *   2. Transaction yaratilmaydi, checkout URL null
 *   3. Admin qo'lda payment_status = PAID + status = APPROVED qiladi
 *      (eski advertise admin controller orqali)
 */
@Injectable()
export class AdvertiseService implements ApprovalHandler {
  private readonly logger = new Logger(AdvertiseService.name);

  constructor(
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<AdvertiseDocument>,
    private readonly fileService: FileService,
    private readonly transactionService: TransactionService,
  ) {}

  async create({
    dto,
    author,
    files,
  }: {
    dto: CreateAdvertiseDto;
    author: string;
    files: { image: Express.Multer.File[] };
  }): Promise<CreateAdvertiseResult> {
    if (!files?.image?.[0]) {
      throw new BadRequestException('Reklama rasmini yuborishingiz shart!');
    }

    const { totalPrice, currency } = this.priceCalculus(dto.days);
    const image = await this.fileService.saveFile({
      folder: EnumFilesFolder.PHOTOS,
      file: files.image[0],
    });

    let newAdvertise: AdvertiseDocument;
    try {
      newAdvertise = await this.advertiseModel.create({
        ...dto,
        author,
        price: totalPrice,
        currency,
        image,
      });
    } catch (error) {
      await this.fileService.deleteFile(image);
      throw error;
    }

    const provider = this.resolveProvider();

    // Payment provider yo'q -> eski flow (admin qo'lda)
    if (provider === 'NONE') {
      return {
        advertise: newAdvertise,
        transactionId: null,
        checkoutUrl: null,
        provider: 'NONE',
      };
    }

    // To'lov yaratish
    try {
      const transaction = await this.transactionService.createPending({
        user: author,
        orderType: OrderTypeEnum.ADVERTISE,
        orderId: String(newAdvertise._id),
        amount: totalPrice,
        currency,
        provider,
      });

      const transactionId = String(transaction._id);
      const checkoutUrl = generatePaymeUrl({
        amount: totalPrice,
        orderId: transactionId,
      });

      return {
        advertise: newAdvertise,
        transactionId,
        checkoutUrl,
        provider,
      };
    } catch (err) {
      // Transaction yaratish xato bo'lsa, advertise saqlanib qoldi —
      // foydalanuvchi qaytadan checkout boshlashi mumkin (kelajakda)
      this.logger.error(
        `Advertise yaratildi (${String(newAdvertise._id)}) lekin Transaction yaratilmadi: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * ApprovalHandler implementatsiyasi — admin approve qilganda chaqiriladi.
   * orderId = Advertise._id (string).
   *
   * Bu yerda Advertise PAID + APPROVED qilinadi va from/to oraliq belgilanadi.
   * `from` = hozir, `to` = hozir + days.
   */
  async activate(orderId: string) {
    const advertise = await this.advertiseModel.findById(orderId);
    if (!advertise) {
      throw new NotFoundException('Advertise topilmadi');
    }

    const now = new Date();
    const to = new Date(now.getTime() + advertise.days * 24 * 60 * 60 * 1000);

    advertise.payment_status = EnumPaymentStatus.PAID;
    advertise.status = EnumAdvertiseStatus.APPROVED;
    advertise.from = now;
    advertise.to = to;
    await advertise.save();

    return advertise;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    type?: EnumAdvertiseType;
    sample?: boolean;
    sort?: Record<string, 1 | -1>;
  }) {
    const { page = 1, limit = 10, type, sample = false, sort } = params;

    const filter: FilterQuery<AdvertiseDocument> = {
      status: EnumAdvertiseStatus.APPROVED,
      payment_status: EnumPaymentStatus.PAID,
      from: { $ne: null, $lte: new Date() },
      to: { $ne: null, $gte: new Date() },
    };

    if (type) {
      filter.type = type;
    }

    const query = this.advertiseModel.find(filter);

    if (sort) {
      query.sort(sort);
    }

    if (sample) {
      const total = await this.advertiseModel.countDocuments(filter).exec();
      const sampleSize = Math.min(limit, total);
      let advertises: AdvertiseDocument[] = [];

      if (sampleSize > 0) {
        advertises = await this.advertiseModel.aggregate([
          { $match: filter },
          { $sample: { size: sampleSize } },
        ]);
      }
      return advertises;
    }

    const skip = (page - 1) * limit;
    const advertises = await query
      .skip(skip)
      .limit(limit)
      .populate('author', 'first_name last_name avatar')
      .lean()
      .exec();

    const total = await this.advertiseModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return {
      data: advertises,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findMy(author: string) {
    const advertises = await this.advertiseModel.find({ author });
    return advertises;
  }

  async findById(id: string) {
    const advertise = await this.advertiseModel.findById(id);
    if (!advertise) {
      throw new NotFoundException('Eʼlon topilmadi');
    }
    return advertise;
  }

  async update(
    id: string,
    dto: UpdateAdvertiseDto,
    author: string,
    files?: { image: Express.Multer.File[] },
  ) {
    const advertise = await this.advertiseModel.findOne({ _id: id, author });

    if (!advertise) {
      throw new NotFoundException();
    }

    // Handle image deletion
    if (dto.image_to_delete && advertise.image) {
      await this.fileService.deleteFile(advertise.image);
      advertise.image = undefined;
    }

    // Handle image upload
    let image: string | undefined;
    if (files?.image?.[0]) {
      if (advertise.image) {
        await this.fileService.deleteFile(advertise.image);
      }
      image = await this.fileService.saveFile({
        folder: EnumFilesFolder.PHOTOS,
        file: files.image[0],
      });
      advertise.image = image;
    }

    advertise.status = EnumAdvertiseStatus.PENDING;

    const { image_to_delete: _ignored, ...restDto } = dto;
    void _ignored;

    Object.assign(advertise, restDto);

    return advertise.save();
  }

  async remove(id: string, author: string) {
    const advertise = await this.advertiseModel.findOne({
      _id: id,
      author,
    });

    if (!advertise) {
      throw new NotFoundException();
    }

    if (advertise.image) {
      await this.fileService.deleteFile(advertise.image);
    }
    await advertise.deleteOne();
    return { message: 'Eʼlon muvaffaqiyatli oʻchirildi' };
  }

  /**
   * `to` sanasi o'tgan APPROVED reklamalarni EXPIRED qiladi. Cron har kun
   * 1 marta chaqiradi.
   *
   * @returns expire qilingan reklamalar soni
   */
  async expireOldAdvertises(): Promise<number> {
    const result = await this.advertiseModel.updateMany(
      {
        status: EnumAdvertiseStatus.APPROVED,
        to: { $ne: null, $lt: new Date() },
      },
      {
        $set: { status: EnumAdvertiseStatus.EXPIRED },
      },
    );
    return result.modifiedCount;
  }

  async incrementView(id: string) {
    return this.advertiseModel.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );
  }

  async incrementClick(id: string) {
    return this.advertiseModel.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { new: true },
    );
  }

  priceCalculus(days: number): {
    days: number;
    totalPrice: number;
    currency: CurrencyCode;
  } {
    const dailyPrice = Number(process.env.ADVERTISE_DAILY_PRICE);
    if (!dailyPrice || Number.isNaN(dailyPrice) || dailyPrice < 0) {
      throw new BadRequestException('Serverda kunlik narx noto‘g‘ri sozlangan');
    }

    const totalPrice = days * dailyPrice;

    const currency: CurrencyCode = isSupportedCurrency(
      process.env.ADVERTISE_CURRENCY,
    )
      ? (process.env.ADVERTISE_CURRENCY.toUpperCase() as CurrencyCode)
      : DEFAULT_CURRENCY;

    return {
      days,
      totalPrice,
      currency,
    };
  }

  async findOneByType(type: EnumAdvertiseType) {
    const count = await this.advertiseModel.countDocuments({
      type,
      status: EnumAdvertiseStatus.APPROVED,
      payment_status: EnumPaymentStatus.PAID,
    });

    if (count === 0) return null;

    const offset = Math.floor(Math.random() * count);

    const [advertise] = await this.advertiseModel
      .find({
        type,
        status: EnumAdvertiseStatus.APPROVED,
        payment_status: EnumPaymentStatus.PAID,
      })
      .skip(offset)
      .limit(1);

    return advertise ?? null;
  }

  // ---- privates ----

  private resolveProvider(): PaymentProviderEnum | 'NONE' {
    const raw = (process.env.PAYMENT_PROVIDER || 'payme').toLowerCase();
    if (raw === 'none') return 'NONE';
    if (raw === 'payme') return PaymentProviderEnum.PAYME;
    if (raw === 'click') return PaymentProviderEnum.CLICK;
    throw new InternalServerErrorException(
      `Noma'lum PAYMENT_PROVIDER: ${raw}`,
    );
  }
}
