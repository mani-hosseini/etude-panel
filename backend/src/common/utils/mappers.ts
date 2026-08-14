const PERSIAN_NAME_REGEX = /^[\u0600-\u06FF\u200c\s]{2,40}$/;

export function isPersianName(value: string): boolean {
  return PERSIAN_NAME_REGEX.test(value.trim());
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Student rank 1–10. Unknown legacy values (e.g. «پایه») become 1. */
export function normalizeStudentLevel(value?: string | null): string {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  if (n >= 1 && n <= 10) return String(n);
  return '1';
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!);
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
