import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CurrencyCode } from 'src/common/currencies/currency.enum';
import { AdminApprovalStatusEnum } from 'src/enums/admin-approval-status.enum';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import { PaymentProviderEnum } from 'src/enums/payment-provider.enum';
import { PaymentStatusEnum } from 'src/enums/payment-status.enum';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transaction.schema';

interface CreatePendingParams {
  user: string | Types.ObjectId;
  orderType: OrderTypeEnum;
  orderId: string | Types.ObjectId;
  amount: number;
  currency: CurrencyCode;
  provider: PaymentProviderEnum;
}

interface ListAwaitingParams {
  orderType?: OrderTypeEnum;
  page?: number;
  limit?: number;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Foydalanuvchi to'lovni boshlash uchun yangi PENDING transaction yaratadi.
   * Bir order uchun bir vaqtda faqat bitta active (PENDING/SUCCESS) transaction
   * bo'lishi mumkin.
   */
  async createPending(
    params: CreatePendingParams,
  ): Promise<TransactionDocument> {
    const orderId = toObjectId(params.orderId);
    const userId = toObjectId(params.user);

    if (params.amount <= 0) {
      throw new BadRequestException("Summa noto'g'ri");
    }

    const existingActive = await this.transactionModel.findOne({
      orderId,
      provider: params.provider,
      status: { $in: [PaymentStatusEnum.PENDING, PaymentStatusEnum.SUCCESS] },
    });

    if (existingActive) {
      throw new ConflictException(
        "Bu buyurtma uchun allaqachon faol to'lov bor",
      );
    }

    const created = await this.transactionModel.create({
      user: userId,
      orderType: params.orderType,
      orderId,
      amount: params.amount,
      currency: params.currency,
      provider: params.provider,
      status: PaymentStatusEnum.PENDING,
      adminApprovalStatus: AdminApprovalStatusEnum.NOT_APPLICABLE,
    });

    return created;
  }

  async findById(id: string): Promise<TransactionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.transactionModel.findById(id);
  }

  async findByProviderTxId(
    provider: PaymentProviderEnum,
    providerTransactionId: string,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({ provider, providerTransactionId });
  }

  async findActivePendingForOrder(
    orderId: string | Types.ObjectId,
    provider: PaymentProviderEnum,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({
      orderId: toObjectId(orderId),
      provider,
      status: PaymentStatusEnum.PENDING,
    });
  }

  async findSuccessForOrder(
    orderId: string | Types.ObjectId,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({
      orderId: toObjectId(orderId),
      status: PaymentStatusEnum.SUCCESS,
    });
  }

  /** Admin uchun: tasdiq kutilayotgan to'lovlar (success bo'lgan + AWAITING). */
  async listAwaiting(
    params: ListAwaitingParams = {},
  ): Promise<{ items: TransactionDocument[]; total: number }> {
    const filter: FilterQuery<TransactionDocument> = {
      status: PaymentStatusEnum.SUCCESS,
      adminApprovalStatus: AdminApprovalStatusEnum.AWAITING,
    };
    if (params.orderType) filter.orderType = params.orderType;

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'first_name last_name email phone'),
      this.transactionModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * Admin tasdiqlaydi. orderType'ga qarab tegishli handler chaqirilishi kerak
   * (PremiumService.activate, AdvertiseService.markPaid va h.k.) — bu service
   * faqat Transaction'ni yangilaydi. Handler chaqirish — controller mas'uliyati.
   */
  async markApproved(
    transactionId: string,
    adminId: string | Types.ObjectId,
  ): Promise<TransactionDocument> {
    const tx = await this.transactionModel.findById(transactionId);
    if (!tx) throw new NotFoundException('Transaction topilmadi');

    if (tx.status !== PaymentStatusEnum.SUCCESS) {
      throw new BadRequestException(
        "Faqat muvaffaqiyatli to'lovni tasdiqlash mumkin",
      );
    }
    if (tx.adminApprovalStatus !== AdminApprovalStatusEnum.AWAITING) {
      throw new ConflictException(
        `Bu transaction allaqachon ${tx.adminApprovalStatus} holatida`,
      );
    }

    tx.adminApprovalStatus = AdminApprovalStatusEnum.APPROVED;
    tx.adminApprovedBy = toObjectId(adminId);
    tx.adminApprovedAt = new Date();
    await tx.save();

    return tx;
  }

  async markRejected(
    transactionId: string,
    adminId: string | Types.ObjectId,
    reason: string,
  ): Promise<TransactionDocument> {
    const tx = await this.transactionModel.findById(transactionId);
    if (!tx) throw new NotFoundException('Transaction topilmadi');

    if (tx.status !== PaymentStatusEnum.SUCCESS) {
      throw new BadRequestException(
        "Faqat muvaffaqiyatli to'lovni rad etish mumkin",
      );
    }
    if (tx.adminApprovalStatus !== AdminApprovalStatusEnum.AWAITING) {
      throw new ConflictException(
        `Bu transaction allaqachon ${tx.adminApprovalStatus} holatida`,
      );
    }

    tx.adminApprovalStatus = AdminApprovalStatusEnum.REJECTED;
    tx.adminApprovedBy = toObjectId(adminId);
    tx.adminApprovedAt = new Date();
    tx.adminRejectReason = reason?.trim() || 'Sabab ko‘rsatilmagan';
    await tx.save();

    this.logger.warn(
      `Transaction ${tx._id.toString()} admin tomonidan rad etildi: ${tx.adminRejectReason}`,
    );

    return tx;
  }
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Noto'g'ri ObjectId: ${id}`);
  }
  return new Types.ObjectId(id);
}
