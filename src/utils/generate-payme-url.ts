import { InternalServerErrorException } from '@nestjs/common';

/**
 * Payme checkout URL yaratadi (foydalanuvchi shu URL'ga o'tib to'laydi).
 *
 * Param format: `m=<merchant>;ac.order_id=<orderId>;a=<tiyin>` — base64 encoded.
 * `orderId` — bizning loyihamizda `Transaction._id` (string).
 * `amount` — asosiy birlikda (so'm). Tiyinga aylantirilib yuboriladi.
 *
 * Misol natijada:
 *   https://checkout.paycom.uz/<base64_params>
 *
 * Sandbox uchun PAYME_CHECKOUT_URL=https://test.paycom.uz
 */
export function generatePaymeUrl({
  amount,
  orderId,
}: {
  amount: number;
  orderId: string;
}): string {
  const merchantId = process.env.PAYME_MERCHANT_ID;
  if (!merchantId) {
    throw new InternalServerErrorException(
      "Payme to'lov tizimi sozlanmagan: PAYME_MERCHANT_ID yo'q.",
    );
  }

  const baseUrl = process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz';

  const amountInTiyin = Math.round(amount * 100);

  // 'm' = merchant_id, 'ac.order_id' = bizning Transaction._id, 'a' = tiyin
  const params = `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyin}`;
  const encodedParams = Buffer.from(params, 'utf-8').toString('base64');

  // baseUrl oxirida slash bormi tekshiramiz
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/${encodedParams}`;
}
