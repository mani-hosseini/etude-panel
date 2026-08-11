const PERSIAN_NAME_REGEX = /^[\u0600-\u06FF\u200c\s]{2,40}$/;

export function isPersianName(value: string): boolean {
  return PERSIAN_NAME_REGEX.test(value.trim());
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!);
}

export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) =>
    String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
  );
}

/** Normalize Iranian mobile to 09xxxxxxxxx or null if empty. */
export function normalizePhone(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  let digits = toAsciiDigits(value).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('98') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    digits = `0${digits}`;
  }
  return digits;
}

export function normalizeNationalId(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const digits = toAsciiDigits(value).replace(/\D/g, '');
  return digits || null;
}

export function normalizeAddress(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export const SESSION_STATUS_API = {
  AVAILABLE: 'available',
  UPCOMING: 'upcoming',
  LOCKED: 'locked',
} as const;

export const LESSON_STATUS_API = {
  DONE: 'done',
  NEXT: 'next',
  PLANNED: 'planned',
} as const;

export const SLIDE_KIND_API = {
  COVER: 'cover',
  LESSON: 'lesson',
  VISUAL: 'visual',
  OUTRO: 'outro',
} as const;
