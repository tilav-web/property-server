/**
 * Admin tomonidan to'lovni tasdiqlash holati. Payme webhook'i transaction'ni
 * SUCCESS qilgach, admin ko'rib chiqishi (approve/reject) kerak.
 *
 * - AWAITING: to'lov amalga oshdi, admin javobi kutilmoqda
 * - APPROVED: admin tasdiqladi, real natija ishga tushdi (advertise paid,
 *   premium yoqildi, va h.k.)
 * - REJECTED: admin rad etdi, refund qo'lda qilinadi
 * - NOT_APPLICABLE: to'lov hali success bo'lmagan, admin uchun keraksiz
 */
export enum AdminApprovalStatusEnum {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  AWAITING = 'AWAITING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
