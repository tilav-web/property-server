/**
 * To'lov ob'ekti turi. Yangi to'lov yo'nalishi qo'shilsa shu yerga qo'shing
 * va TransactionService.applyApproval()'da handler yozing.
 */
export enum OrderTypeEnum {
  /** Reklama (banner / featured ad). orderId = Advertise._id */
  ADVERTISE = 'ADVERTISE',
  /** E'lonni premium qilish (30 kun). orderId = Property._id */
  PROPERTY_PREMIUM = 'PROPERTY_PREMIUM',
  /** Voice AI premium (cheksiz, N kun). orderId = User._id */
  VOICE_PREMIUM = 'VOICE_PREMIUM',
}
