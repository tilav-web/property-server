import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OrderTypeEnum } from 'src/enums/order-type.enum';
import { PaymentStatusEnum } from 'src/enums/payment-status.enum';
import { AdminApprovalStatusEnum } from 'src/enums/admin-approval-status.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/modules/notification/enums/notification-type.enum';
import { TransactionService } from './transaction.service';
import { TransactionDocument } from '../schemas/transaction.schema';
import { formatOrderTypeLabel } from '../utils/order-type-label.util';

/**
 * Admin tasdiqlashidan keyin orderType'ga qarab real natijani ishga
 * tushiruvchi dispatcher.
 *
 * Har bir orderType uchun mos handler module shu service'ga `register`
 * qiladi — circular dependency'dan saqlanish uchun lazy lookup (ModuleRef
 * orqali) ishlatamiz.
 *
 * Yangi orderType qo'shganda:
 *  1. OrderTypeEnum'ga qiymat qo'shing
 *  2. Mos handler class yarating (`activate(orderId): Promise<unknown>`)
 *  3. APPROVAL_HANDLERS'ga ulang (handler class reference)
 */
export interface ApprovalHandler {
  /** Admin approve qildi — real natija ishga tushadi. */
  activate(orderId: string): Promise<unknown>;
}

/**
 * orderType -> handler class.
 *
 * Class reference'lar string sifatida saqlanadi (lazy lookup) — circular
 * dependency'dan saqlanish uchun. Handler class'lar PaymentApprovalModule'ga
 * import qilingan modullarda providers/exports qatorida bo'lishi shart.
 */
const APPROVAL_HANDLERS: Record<OrderTypeEnum, string> = {
  [OrderTypeEnum.PROPERTY_PREMIUM]: 'PropertyPremiumService',
  [OrderTypeEnum.ADVERTISE]: 'AdvertiseService',
  [OrderTypeEnum.PREMIUM]: 'PremiumService',
  // Legacy compat: eski VOICE_PREMIUM tranzaksiyalar ham PremiumService'ga
  [OrderTypeEnum.VOICE_PREMIUM]: 'PremiumService',
};

@Injectable()
export class PaymentApprovalService {
  private readonly logger = new Logger(PaymentApprovalService.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly moduleRef: ModuleRef,
    private readonly notificationService: NotificationService,
  ) {}

  async approve(transactionId: string, adminId: string) {
    const tx = await this.transactionService.findById(transactionId);
    if (!tx) throw new NotFoundException('Transaction topilmadi');

    if (tx.status !== PaymentStatusEnum.SUCCESS) {
      throw new BadRequestException(
        "Faqat muvaffaqiyatli to'lovni tasdiqlash mumkin",
      );
    }
    if (tx.adminApprovalStatus !== AdminApprovalStatusEnum.AWAITING) {
      throw new BadRequestException(
        `Transaction allaqachon ${tx.adminApprovalStatus} holatida`,
      );
    }

    // Avval real natijani ishga tushiramiz (handler chaqiriladi)
    const handler = this.resolveHandler(tx.orderType);
    let activationResult: unknown;
    try {
      activationResult = await handler.activate(tx.orderId.toString());
    } catch (err) {
      this.logger.error(
        `Approval handler xato (${tx.orderType}, tx=${transactionId}): ${(err as Error).message}`,
      );
      throw err;
    }

    // Faqat real natija muvaffaqiyatli bo'lgandan keyin Transaction'ni
    // APPROVED deb belgilaymiz
    const updated = await this.transactionService.markApproved(
      transactionId,
      adminId,
    );

    void this.notifyUserAboutDecision(updated, 'approved');

    return {
      transaction: updated,
      activationResult,
    };
  }

  async reject(transactionId: string, adminId: string, reason: string) {
    const updated = await this.transactionService.markRejected(
      transactionId,
      adminId,
      reason,
    );

    void this.notifyUserAboutDecision(updated, 'rejected', reason);

    return updated;
  }

  /**
   * To'lov qilgan userga tasdiq/rad javobini yuboradi. Fire-and-forget —
   * notification xatosi approve/reject natijasini bloklamasin
   * (payme.service.ts'dagi admin xabarnomasi bilan bir xil pattern).
   */
  private async notifyUserAboutDecision(
    tx: TransactionDocument,
    decision: 'approved' | 'rejected',
    rejectReason?: string,
  ): Promise<void> {
    try {
      const orderTypeLabel = formatOrderTypeLabel(tx.orderType);
      if (decision === 'approved') {
        await this.notificationService.create({
          user: tx.user,
          type: NotificationType.PAYMENT_APPROVED,
          title: "To'lovingiz tasdiqlandi",
          body: `${orderTypeLabel}: ${tx.amount} ${tx.currency} — to'lovingiz tasdiqlandi`,
          link: '/profile/payments',
          payload: { transactionId: String(tx._id), orderType: tx.orderType },
        });
      } else {
        await this.notificationService.create({
          user: tx.user,
          type: NotificationType.PAYMENT_REJECTED,
          title: "To'lovingiz rad etildi",
          body: rejectReason
            ? `${orderTypeLabel}: ${tx.amount} ${tx.currency} — rad etildi. Sabab: ${rejectReason}`
            : `${orderTypeLabel}: ${tx.amount} ${tx.currency} — rad etildi`,
          link: '/profile/payments',
          payload: { transactionId: String(tx._id), orderType: tx.orderType },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Foydalanuvchiga to'lov javobi yuborilmadi (tx=${String(tx._id)}): ${(err as Error).message}`,
      );
    }
  }

  private resolveHandler(orderType: OrderTypeEnum): ApprovalHandler {
    const handlerName = APPROVAL_HANDLERS[orderType];
    if (!handlerName) {
      throw new BadRequestException(
        `OrderType ${orderType} uchun approval handler ro'yxatdan o'tmagan`,
      );
    }
    let handler: ApprovalHandler | undefined;
    try {
      handler = this.moduleRef.get<ApprovalHandler>(handlerName, {
        strict: false,
      });
    } catch {
      handler = undefined;
    }
    if (!handler || typeof handler.activate !== 'function') {
      throw new BadRequestException(
        `Approval handler "${handlerName}" topilmadi yoki activate() yo'q. ` +
          `Mos modul AppModule'ga import qilinganligini tekshiring.`,
      );
    }
    return handler;
  }
}
