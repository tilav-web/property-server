import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/modules/notification/enums/notification-type.enum';
import { AdminApprovalStatusEnum } from 'src/enums/admin-approval-status.enum';
import { PaymentProviderEnum } from 'src/enums/payment-provider.enum';
import { PaymentStatusEnum } from 'src/enums/payment-status.enum';
import { PaymeErrorCodeEnum } from 'src/enums/payme-error-code.enum';
import { PaymeMethodEnum } from 'src/enums/payme-method.enum';
import { PaymeTransactionStateEnum } from 'src/enums/payme-transaction-state.enum';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transaction.schema';
import {
  CancelTransactionParams,
  CheckPerformParams,
  CreateTransactionParams,
  GetStatementParams,
  JsonRpcId,
  ParsedRpcRequest,
  PaymeErrorResponse,
  PaymeRpcResponse,
  TransactionIdParams,
} from '../types/payme.types';

/**
 * Payme Merchant API server implementatsiyasi.
 *
 * Webhook /api/payme/webhook orqali Payme JSON-RPC so'rovlarni qabul qiladi.
 * Authorization (Basic + IP whitelist) controller darajasida tekshiriladi.
 *
 * Asosiy farq izgara-server'dan: bizning Transaction'imiz universal
 * (orderType + orderId), Order yo'q. Tekshiruvlar Transaction darajasida.
 *
 * Payme `ac.order_id` parametri sifatida bizning Transaction._id (string)
 * yuboriladi — checkout URL yaratganimizda generatePaymeUrl() shunday qiladi.
 *
 * Port manbai: /home/tilav_web/Projects/izgara-server/src/modules/payment/services/payme.service.ts
 */
@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async handleRequest(body: unknown): Promise<PaymeRpcResponse> {
    const request = this.parseRequest(body);

    if (!request) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid JSON-RPC request',
        null,
      );
    }

    const { method, params, id } = request;

    try {
      switch (method) {
        case PaymeMethodEnum.CHECK_PERFORM_TRANSACTION:
          return await this.checkPerformTransaction(params, id);
        case PaymeMethodEnum.CREATE_TRANSACTION:
          return await this.createTransaction(params, id);
        case PaymeMethodEnum.PERFORM_TRANSACTION:
          return await this.performTransaction(params, id);
        case PaymeMethodEnum.CANCEL_TRANSACTION:
          return await this.cancelTransaction(params, id);
        case PaymeMethodEnum.CHECK_TRANSACTION:
          return await this.checkTransaction(params, id);
        case PaymeMethodEnum.GET_STATEMENT:
          return await this.getStatement(params, id);
        case PaymeMethodEnum.SET_FISCAL_DATA:
          return this.setFiscalData(id);
        default:
          return this.error(
            PaymeErrorCodeEnum.METHOD_NOT_FOUND,
            'Method not found',
            id,
            method,
          );
      }
    } catch (err) {
      this.logger.error(
        `Payme RPC handler xato (${method}): ${(err as Error).message}`,
        (err as Error).stack,
      );
      return this.error(
        PaymeErrorCodeEnum.INTERNAL_SYSTEM_ERROR,
        'Internal error',
        id,
      );
    }
  }

  // ============================================================
  // RPC METHOD'LAR
  // ============================================================

  private async checkPerformTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseCheckPerformParams(params);
    if (!parsed) return this.invalidAccountError(id);

    if (!this.isValidAmount(parsed.amount)) {
      return this.error(PaymeErrorCodeEnum.INVALID_AMOUNT, 'Invalid amount', id);
    }

    if (!Types.ObjectId.isValid(parsed.account.order_id)) {
      return this.invalidAccountError(id);
    }

    const tx = await this.transactionModel.findById(parsed.account.order_id);
    if (!tx || tx.provider !== PaymentProviderEnum.PAYME) {
      return this.invalidAccountError(id);
    }

    // Avval amount mosligi (Payme sandbox spec: input validation
    // state validation'dan oldin bo'lishi kerak — "Неверная сумма"
    // testi har qaysi state'da -31001 kutadi).
    const amountTiyin = this.toTiyin(tx.amount);
    if (amountTiyin !== parsed.amount) {
      return this.error(PaymeErrorCodeEnum.INVALID_AMOUNT, 'Invalid amount', id);
    }

    if (tx.status === PaymentStatusEnum.SUCCESS) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order already paid',
        id,
      );
    }
    if (tx.status === PaymentStatusEnum.CANCELLED) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Transaction cancelled',
        id,
      );
    }

    return {
      result: { allow: true },
      id,
    };
  }

  private async createTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseCreateTransactionParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid CreateTransaction params',
        id,
      );
    }

    if (!this.isValidAmount(parsed.amount)) {
      return this.error(PaymeErrorCodeEnum.INVALID_AMOUNT, 'Invalid amount', id);
    }

    if (!Types.ObjectId.isValid(parsed.account.order_id)) {
      return this.invalidAccountError(id);
    }

    const tx = await this.transactionModel.findById(parsed.account.order_id);
    if (!tx || tx.provider !== PaymentProviderEnum.PAYME) {
      return this.invalidAccountError(id);
    }

    // Amount mosligi state'dan oldin tekshiriladi (sandbox spec).
    const amountTiyin = this.toTiyin(tx.amount);
    if (amountTiyin !== parsed.amount) {
      return this.error(PaymeErrorCodeEnum.INVALID_AMOUNT, 'Invalid amount', id);
    }

    if (tx.status === PaymentStatusEnum.SUCCESS) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order already paid',
        id,
      );
    }
    if (tx.status === PaymentStatusEnum.CANCELLED) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Transaction cancelled',
        id,
      );
    }

    // Agar shu Payme transaction'i avval kelgan bo'lsa — idempotency
    if (tx.providerTransactionId === parsed.id) {
      const state = this.mapStatusToPaymeState(tx);
      if (state !== PaymeTransactionStateEnum.CREATED) {
        return this.error(
          PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
          'Transaction state invalid',
          id,
        );
      }
      return {
        result: {
          create_time: this.resolveCreateTime(tx),
          transaction: tx._id.toString(),
          state,
        },
        id,
      };
    }

    // Boshqa Payme transaction allaqachon ushbu order'da bormi (active)?
    if (
      tx.providerTransactionId &&
      tx.providerTransactionId !== parsed.id &&
      tx.status === PaymentStatusEnum.PENDING
    ) {
      return this.error(
        PaymeErrorCodeEnum.ORDER_HAS_ACTIVE_TRANSACTION,
        'Order has active transaction',
        id,
        'account.order_id',
      );
    }

    tx.providerTransactionId = parsed.id;
    tx.providerCreateTime = parsed.time;
    tx.status = PaymentStatusEnum.PENDING;
    await tx.save();

    return {
      result: {
        create_time: this.resolveCreateTime(tx),
        transaction: tx._id.toString(),
        state: PaymeTransactionStateEnum.CREATED,
      },
      id,
    };
  }

  private async performTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseTransactionIdParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid PerformTransaction params',
        id,
      );
    }

    const tx = await this.transactionModel.findOne({
      provider: PaymentProviderEnum.PAYME,
      providerTransactionId: parsed.id,
    });

    if (!tx) {
      return this.error(
        PaymeErrorCodeEnum.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        id,
        'id',
      );
    }

    if (tx.status === PaymentStatusEnum.CANCELLED) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Transaction state invalid',
        id,
      );
    }

    if (tx.status === PaymentStatusEnum.SUCCESS) {
      // Idempotent — Payme retry
      const performTime = tx.providerPerformTime ?? Date.now();
      return {
        result: {
          transaction: tx._id.toString(),
          perform_time: performTime,
          state: PaymeTransactionStateEnum.PERFORMED,
        },
        id,
      };
    }

    const performTime = Date.now();
    tx.status = PaymentStatusEnum.SUCCESS;
    tx.providerPerformTime = performTime;
    // To'lov muvaffaqiyatli — admin tasdiqlashi kutilmoqda
    tx.adminApprovalStatus = AdminApprovalStatusEnum.AWAITING;
    await tx.save();

    this.logger.log(
      `Payme PerformTransaction OK: tx=${tx._id.toString()}, orderType=${tx.orderType}, orderId=${tx.orderId.toString()}`,
    );

    // Admin'larga notification (block qilmaymiz — webhook tezkor javob qaytarishi kerak)
    void this.notifyAdminsAboutNewPayment(tx);

    return {
      result: {
        transaction: tx._id.toString(),
        perform_time: performTime,
        state: PaymeTransactionStateEnum.PERFORMED,
      },
      id,
    };
  }

  /**
   * Payme PerformTransaction muvaffaqiyatli bo'lganda barcha admin'larga
   * "yangi to'lov keldi" notification yuboradi. Xato bo'lsa log qiladi,
   * lekin webhook javobiga ta'sir qilmaydi.
   */
  private async notifyAdminsAboutNewPayment(
    tx: TransactionDocument,
  ): Promise<void> {
    try {
      const orderTypeLabel = this.formatOrderType(tx.orderType);
      await this.notificationService.notifyAllAdmins({
        type: NotificationType.PAYMENT_AWAITING_APPROVAL,
        title: 'Yangi to‘lov tasdiqlash uchun keldi',
        body: `${orderTypeLabel}: ${tx.amount} ${tx.currency} — tasdiqlash kutilmoqda`,
        link: `/admins/payments?status=AWAITING`,
        payload: {
          transactionId: String(tx._id),
          orderType: tx.orderType,
          orderId: String(tx.orderId),
          amount: tx.amount,
          currency: tx.currency,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Admin notification yuborilmadi (tx=${String(tx._id)}): ${(err as Error).message}`,
      );
    }
  }

  private formatOrderType(orderType: string): string {
    switch (orderType) {
      case 'PROPERTY_PREMIUM':
        return 'E’lon premium upgrade';
      case 'ADVERTISE':
        return 'Reklama';
      default:
        return orderType;
    }
  }

  private async cancelTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseCancelTransactionParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid CancelTransaction params',
        id,
      );
    }

    const tx = await this.transactionModel.findOne({
      provider: PaymentProviderEnum.PAYME,
      providerTransactionId: parsed.id,
    });

    if (!tx) {
      return this.error(
        PaymeErrorCodeEnum.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        id,
        'id',
      );
    }

    const wasPerformed =
      tx.providerPerformTime != null || tx.status === PaymentStatusEnum.SUCCESS;
    const cancelledState = wasPerformed
      ? PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
      : PaymeTransactionStateEnum.CANCELLED_FROM_CREATED;
    const cancelReason = this.resolveCancelReason(cancelledState);

    if (tx.status === PaymentStatusEnum.CANCELLED) {
      // Idempotent — qaytma cancel
      if (tx.providerCancelTime == null) {
        tx.providerCancelTime = tx.updatedAt
          ? tx.updatedAt.getTime()
          : Date.now();
      }
      if (tx.cancelReason !== cancelReason) {
        tx.cancelReason = cancelReason;
      }
      await tx.save();

      return {
        result: {
          transaction: tx._id.toString(),
          cancel_time: this.resolveCancelTime(tx),
          state: cancelledState,
        },
        id,
      };
    }

    tx.status = PaymentStatusEnum.CANCELLED;
    tx.providerCancelTime = Date.now();
    tx.cancelReason = cancelReason;
    if (wasPerformed) {
      // Admin tasdiqlamagan bo'lsa, NOT_APPLICABLE qaytaramiz
      if (tx.adminApprovalStatus === AdminApprovalStatusEnum.AWAITING) {
        tx.adminApprovalStatus = AdminApprovalStatusEnum.NOT_APPLICABLE;
      }
    }
    await tx.save();

    this.logger.warn(
      `Payme CancelTransaction: tx=${tx._id.toString()}, reason=${cancelReason}, wasPerformed=${wasPerformed}`,
    );

    // TODO (Bosqich 3): Agar admin allaqachon approved qilgan bo'lsa, rollback (premium o'chirish, advertise reject) logikasi qo'shilishi mumkin

    return {
      result: {
        transaction: tx._id.toString(),
        cancel_time: this.resolveCancelTime(tx),
        state: cancelledState,
      },
      id,
    };
  }

  private async checkTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseTransactionIdParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid CheckTransaction params',
        id,
      );
    }

    const tx = await this.transactionModel.findOne({
      provider: PaymentProviderEnum.PAYME,
      providerTransactionId: parsed.id,
    });

    if (!tx) {
      return this.error(
        PaymeErrorCodeEnum.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        id,
        'id',
      );
    }

    let state = this.mapStatusToPaymeState(tx);
    if (
      tx.providerPerformTime != null &&
      state === PaymeTransactionStateEnum.CANCELLED_FROM_CREATED
    ) {
      state = PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED;
    }

    return {
      result: {
        create_time: this.resolveCreateTime(tx),
        perform_time: this.resolvePerformTime(tx, state),
        cancel_time: this.isCancelledState(state) ? this.resolveCancelTime(tx) : 0,
        transaction: tx._id.toString(),
        state,
        reason: this.resolveReasonByState(state),
      },
      id,
    };
  }

  private async getStatement(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseGetStatementParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid GetStatement params',
        id,
      );
    }

    const txs = await this.transactionModel
      .find({
        provider: PaymentProviderEnum.PAYME,
        providerTransactionId: { $exists: true, $ne: null },
        createdAt: {
          $gte: new Date(parsed.from),
          $lte: new Date(parsed.to),
        },
      })
      .sort({ createdAt: 1 });

    return {
      result: {
        transactions: txs.map((tx) => {
          let state = this.mapStatusToPaymeState(tx);
          if (
            tx.providerPerformTime != null &&
            state === PaymeTransactionStateEnum.CANCELLED_FROM_CREATED
          ) {
            state = PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED;
          }
          return {
            id: tx.providerTransactionId,
            time: this.resolveCreateTime(tx),
            amount: this.toTiyin(tx.amount),
            account: { order_id: tx._id.toString() },
            create_time: this.resolveCreateTime(tx),
            perform_time: this.resolvePerformTime(tx, state),
            cancel_time: this.isCancelledState(state)
              ? this.resolveCancelTime(tx)
              : 0,
            transaction: tx._id.toString(),
            state,
            reason: this.resolveReasonByState(state),
          };
        }),
      },
      id,
    };
  }

  private setFiscalData(id: JsonRpcId): PaymeRpcResponse {
    // Property loyihasida fiscal data hozircha kerak emas (advertise/premium
    // uchun chek tushishi shart emas). Payme bu method'ni keyinroq talab
    // qilsa, bu yerda implementatsiya qo'shiladi.
    return {
      result: { success: true },
      id,
    };
  }

  // ============================================================
  // PARSER'LAR
  // ============================================================

  private parseRequest(body: unknown): ParsedRpcRequest | null {
    if (!this.isRecord(body)) return null;
    const method = body.method;
    const params = body.params;
    const requestId = body.id;

    if (!this.isPaymeMethod(method)) return null;
    if (!this.isRecord(params)) return null;
    if (!this.isJsonRpcId(requestId) && typeof requestId !== 'undefined')
      return null;

    return {
      method,
      params,
      id: requestId === undefined ? null : requestId,
    };
  }

  private parseCheckPerformParams(params: unknown): CheckPerformParams | null {
    if (!this.isRecord(params)) return null;
    const amount = params.amount;
    const account = params.account;
    if (typeof amount !== 'number') return null;
    if (!this.isRecord(account) || typeof account.order_id !== 'string') {
      return null;
    }
    return { amount, account: { order_id: account.order_id } };
  }

  private parseCreateTransactionParams(
    params: unknown,
  ): CreateTransactionParams | null {
    if (!this.isRecord(params)) return null;
    const id = params.id;
    const time = params.time;
    const amount = params.amount;
    const account = params.account;
    const orderId = this.isRecord(account) ? account.order_id : null;

    if (
      typeof id !== 'string' ||
      typeof time !== 'number' ||
      !Number.isInteger(time) ||
      time <= 0 ||
      typeof amount !== 'number' ||
      !this.isRecord(account) ||
      typeof orderId !== 'string'
    ) {
      return null;
    }
    return { id, time, amount, account: { order_id: orderId } };
  }

  private parseTransactionIdParams(
    params: unknown,
  ): TransactionIdParams | null {
    if (!this.isRecord(params)) return null;
    const id = params.id;
    if (typeof id !== 'string') return null;
    return { id };
  }

  private parseCancelTransactionParams(
    params: unknown,
  ): CancelTransactionParams | null {
    if (!this.isRecord(params)) return null;
    const id = params.id;
    const reason = params.reason;
    if (typeof id !== 'string') return null;
    if (typeof reason !== 'undefined' && typeof reason !== 'number') {
      return null;
    }
    return { id, reason };
  }

  private parseGetStatementParams(params: unknown): GetStatementParams | null {
    if (!this.isRecord(params)) return null;
    const from = params.from;
    const to = params.to;
    if (
      typeof from !== 'number' ||
      typeof to !== 'number' ||
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from > to
    ) {
      return null;
    }
    return { from, to };
  }

  // ============================================================
  // HELPERLAR
  // ============================================================

  private mapStatusToPaymeState(
    tx: TransactionDocument,
  ): PaymeTransactionStateEnum {
    if (tx.status === PaymentStatusEnum.SUCCESS) {
      return PaymeTransactionStateEnum.PERFORMED;
    }
    if (tx.status === PaymentStatusEnum.CANCELLED) {
      return tx.providerPerformTime != null
        ? PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
        : PaymeTransactionStateEnum.CANCELLED_FROM_CREATED;
    }
    return PaymeTransactionStateEnum.CREATED;
  }

  private isCancelledState(state: PaymeTransactionStateEnum): boolean {
    return (
      state === PaymeTransactionStateEnum.CANCELLED_FROM_CREATED ||
      state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
    );
  }

  private resolveCreateTime(tx: TransactionDocument): number {
    if (tx.providerCreateTime != null) return Number(tx.providerCreateTime);
    return tx.createdAt ? tx.createdAt.getTime() : Date.now();
  }

  private resolvePerformTime(
    tx: TransactionDocument,
    state: PaymeTransactionStateEnum,
  ): number {
    if (
      state === PaymeTransactionStateEnum.PERFORMED ||
      state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
    ) {
      if (tx.providerPerformTime != null) return Number(tx.providerPerformTime);
      return tx.updatedAt ? tx.updatedAt.getTime() : Date.now();
    }
    return 0;
  }

  private resolveCancelTime(tx: TransactionDocument): number {
    if (tx.providerCancelTime != null) return Number(tx.providerCancelTime);
    return tx.updatedAt ? tx.updatedAt.getTime() : Date.now();
  }

  private resolveReasonByState(
    state: PaymeTransactionStateEnum,
  ): number | null {
    if (state === PaymeTransactionStateEnum.PERFORMED) return null;
    if (this.isCancelledState(state)) {
      return this.resolveCancelReason(state);
    }
    return null;
  }

  private resolveCancelReason(state: PaymeTransactionStateEnum): number {
    // Payme spec: 5 = performed transaction cancellation, 3 = generic cancellation
    return state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED ? 5 : 3;
  }

  private toTiyin(amountInSom: number): number {
    return Math.round(Number(amountInSom) * 100);
  }

  private isValidAmount(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isJsonRpcId(value: unknown): value is JsonRpcId {
    return (
      typeof value === 'string' || typeof value === 'number' || value === null
    );
  }

  private isPaymeMethod(value: unknown): value is PaymeMethodEnum {
    return Object.values(PaymeMethodEnum).includes(value as PaymeMethodEnum);
  }

  private invalidAccountError(id: JsonRpcId): PaymeErrorResponse {
    return {
      error: {
        code: PaymeErrorCodeEnum.INVALID_ACCOUNT,
        message: {
          ru: 'Заказ не найден',
          uz: 'Buyurtma topilmadi',
          en: 'Order not found',
        },
        data: 'account.order_id',
      },
      id,
    };
  }

  private error(
    code: number,
    message: string,
    id: JsonRpcId,
    data?: string,
  ): PaymeErrorResponse {
    return {
      error: {
        code,
        message,
        ...(data ? { data } : {}),
      },
      id,
    };
  }
}
