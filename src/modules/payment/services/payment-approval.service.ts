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
import { TransactionService } from './transaction.service';

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
  [OrderTypeEnum.ADVERTISE]: 'AdvertiseApprovalHandler', // kelajakda
};

@Injectable()
export class PaymentApprovalService {
  private readonly logger = new Logger(PaymentApprovalService.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly moduleRef: ModuleRef,
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

    return {
      transaction: updated,
      activationResult,
    };
  }

  async reject(transactionId: string, adminId: string, reason: string) {
    return this.transactionService.markRejected(transactionId, adminId, reason);
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
