/**
 * Yangi (universal) Transaction holati. Mavjud `EnumPaymentStatus`
 * (advertise-payment-status) eskirgan — Advertise bilan birga integratsiya
 * paytida olib tashlanadi yoki to'g'ridan-to'g'ri shu enum'ga moslashtiriladi.
 */
export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
