import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CurrencyCode } from 'src/common/currencies/currency.enum';
import { SUPPORTED_CURRENCIES } from 'src/common/currencies/currencies.constant';
import { AdminApprovalStatusEnum } from 'src/enums/admin-approval-status.enum';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import { PaymentProviderEnum } from 'src/enums/payment-provider.enum';
import { PaymentStatusEnum } from 'src/enums/payment-status.enum';

export type TransactionDocument = Document<Types.ObjectId> &
  Transaction & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  /** To'lov qilgan foydalanuvchi. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  /** Buyurtma turi — qaysi narsaga to'lov ketmoqda. */
  @Prop({
    type: String,
    enum: OrderTypeEnum,
    required: true,
    index: true,
  })
  orderType: OrderTypeEnum;

  /**
   * Buyurtma ID — polymorphic reference. orderType'ga qarab:
   * ADVERTISE -> Advertise._id
   * PROPERTY_PREMIUM -> Property._id
   */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  /** Summa (asosiy birlikda — so'm, ringgit va h.k.). Tiyin/cent EMAS. */
  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({
    type: String,
    enum: SUPPORTED_CURRENCIES,
    required: true,
  })
  currency: CurrencyCode;

  // ===== Provider (Payme / Click) =====

  @Prop({
    type: String,
    enum: PaymentProviderEnum,
    required: true,
    index: true,
  })
  provider: PaymentProviderEnum;

  /** Payme/Click bergan transaction ID. CreateTransaction'da o'rnatiladi. */
  @Prop({ type: String, required: false, index: true, sparse: true })
  providerTransactionId?: string;

  /** Payme `time` parametri — ms. CreateTransaction params'idan. */
  @Prop({ type: Number, required: false })
  providerCreateTime?: number;

  /** PerformTransaction muvaffaqiyatli bo'lganda — ms. */
  @Prop({ type: Number, required: false })
  providerPerformTime?: number;

  /** CancelTransaction muvaffaqiyatli bo'lganda — ms. */
  @Prop({ type: Number, required: false })
  providerCancelTime?: number;

  /** Payme cancel reason kodi (1-5, 7, 10). */
  @Prop({ type: Number, required: false })
  cancelReason?: number;

  // ===== Status =====

  @Prop({
    type: String,
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.PENDING,
    index: true,
  })
  status: PaymentStatusEnum;

  // ===== Admin approval (to'lov SUCCESS bo'lgandan keyin) =====

  @Prop({
    type: String,
    enum: AdminApprovalStatusEnum,
    default: AdminApprovalStatusEnum.NOT_APPLICABLE,
    index: true,
  })
  adminApprovalStatus: AdminApprovalStatusEnum;

  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  adminApprovedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  adminApprovedAt?: Date;

  @Prop({ type: String, required: false })
  adminRejectReason?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Bitta order uchun bitta active Payme transaction bo'lishi mumkin
TransactionSchema.index(
  { orderId: 1, provider: 1, status: 1 },
  { name: 'order_provider_status_idx' },
);

// Provider transaction ID bo'yicha tezkor qidiruv
TransactionSchema.index(
  { provider: 1, providerTransactionId: 1 },
  { name: 'provider_txid_idx', sparse: true },
);

// Admin pending review list uchun
TransactionSchema.index(
  { adminApprovalStatus: 1, createdAt: -1 },
  { name: 'admin_approval_recent_idx' },
);
