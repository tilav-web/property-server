export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  PRICE_OFFER = 'price_offer',
  INQUIRY_RESPONSE = 'inquiry_response',
  PROPERTY_APPROVED = 'property_approved',
  PROPERTY_REJECTED = 'property_rejected',
  PROJECT_INQUIRY = 'project_inquiry',
  /** Admin uchun: yangi to'lov keldi va tasdiqlash kutmoqda. */
  PAYMENT_AWAITING_APPROVAL = 'payment_awaiting_approval',
}
