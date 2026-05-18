/**
 * Payme Merchant API transaction state'lari.
 * Rasmiy spetsifikatsiyaga ko'ra: developer.help.paycom.uz
 */
export enum PaymeTransactionStateEnum {
  CREATED = 1,
  PERFORMED = 2,
  CANCELLED_FROM_CREATED = -1,
  CANCELLED_FROM_PERFORMED = -2,
}
