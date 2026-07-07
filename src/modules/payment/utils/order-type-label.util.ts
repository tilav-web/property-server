/** Notification matnlarida ko'rsatish uchun orderType'ning o'zbekcha nomi. */
export function formatOrderTypeLabel(orderType: string): string {
  switch (orderType) {
    case 'PROPERTY_PREMIUM':
      return 'E’lon premium upgrade';
    case 'ADVERTISE':
      return 'Reklama';
    case 'PREMIUM':
    case 'VOICE_PREMIUM':
      return 'Premium obuna';
    default:
      return orderType;
  }
}
