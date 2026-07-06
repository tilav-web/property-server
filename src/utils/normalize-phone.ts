export const PHONE_REGEX = /^\+?\d{9,15}$/;

export function isPhone(identifier: string): boolean {
  return PHONE_REGEX.test(identifier.replace(/[\s-]/g, ''));
}

export function normalizePhone(input: string): string {
  return input.replace(/[^\d]/g, '');
}
