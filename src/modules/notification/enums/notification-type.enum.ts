export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  PRICE_OFFER = 'price_offer',
  INQUIRY_RESPONSE = 'inquiry_response',
  PROPERTY_APPROVED = 'property_approved',
  PROPERTY_REJECTED = 'property_rejected',
  PROJECT_INQUIRY = 'project_inquiry',
  /** Admin uchun: yangi to'lov keldi va tasdiqlash kutmoqda. */
  PAYMENT_AWAITING_APPROVAL = 'payment_awaiting_approval',
  /** User: to'lovi admin tomonidan tasdiqlandi. */
  PAYMENT_APPROVED = 'payment_approved',
  /** User: to'lovi admin tomonidan rad etildi. */
  PAYMENT_REJECTED = 'payment_rejected',
  /** User: premium tugadi, X kun ichida ortiqcha property arxivlanadi. */
  PREMIUM_EXPIRED_GRACE = 'premium_expired_grace',
  /** User: grace tugadi, eng eski ortiqchalar avtomatik arxivlandi. */
  PREMIUM_EXPIRED_ARCHIVED = 'premium_expired_archived',
  /** User: admin tomonidan premium berildi/uzaytirildi. */
  PREMIUM_GRANTED = 'premium_granted',
}
