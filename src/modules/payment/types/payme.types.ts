import { PaymeMethodEnum } from 'src/enums/payme-method.enum';

export type PaymeLocalizedMessage = {
  uz: string;
  ru: string;
  en: string;
};

export type PaymeError = {
  code: number;
  message: string | PaymeLocalizedMessage;
  data?: string;
};

export type JsonRpcId = string | number | null;

export type PaymeSuccessResponse<T> = {
  result: T;
  id: JsonRpcId;
};

export type PaymeErrorResponse = {
  error: PaymeError;
  id: JsonRpcId;
};

export type PaymeRpcResponse<T = Record<string, unknown>> =
  | PaymeSuccessResponse<T>
  | PaymeErrorResponse;

export type ParsedRpcRequest = {
  method: PaymeMethodEnum;
  params: unknown;
  id: JsonRpcId;
};

/**
 * Account format — Payme `ac.<field>` parametrlari bo'yicha keladi.
 * Bizning loyihada `ac.order_id` ishlatiladi (Transaction yaratganimizda
 * checkout URL'ga `ac.order_id=<transactionId>` qo'yamiz).
 */
export type AccountWithOrderId = {
  order_id: string;
};

export type CheckPerformParams = {
  amount: number;
  account: AccountWithOrderId;
};

export type CreateTransactionParams = {
  id: string;
  time: number;
  amount: number;
  account: AccountWithOrderId;
};

export type TransactionIdParams = {
  id: string;
};

export type CancelTransactionParams = {
  id: string;
  reason?: number;
};

export type GetStatementParams = {
  from: number;
  to: number;
};
