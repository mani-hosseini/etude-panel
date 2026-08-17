import { toPersianDigits } from './mappers';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)));
}

function pad2(value: string): string {
  return value.padStart(2, '0');
}

function formatClock(hhmm: string): string {
  const latin = toLatinDigits(hhmm).trim();
  const [hourRaw, minuteRaw] = latin.split(':');
  const hour = String(Number(hourRaw));
  const minute = minuteRaw ?? '00';
  if (minute === '00' || minute === '0') return toPersianDigits(hour);
  return `${toPersianDigits(hour)}:${toPersianDigits(pad2(minute))}`;
}

/** e.g. 11:00 + 13:00 → «۱۱ تا ۱۳» */
export function formatTimeRange(
  start?: string | null,
  end?: string | null,
  fallback = '',
): string {
  if (!start?.trim() || !end?.trim()) return fallback;
  return `${formatClock(start)} تا ${formatClock(end)}`;
}

export function parseTimeRange(
  label?: string | null,
): { start: string; end: string } | null {
  if (!label?.trim()) return null;
  const latin = toLatinDigits(label);
  const match = latin.match(
    /(\d{1,2})(?::(\d{2}))?\s*(?:تا|—|-|–)\s*(\d{1,2})(?::(\d{2}))?/,
  );
  if (!match) return null;
  return {
    start: `${pad2(match[1]!)}:${match[2] ?? '00'}`,
    end: `${pad2(match[3]!)}:${match[4] ?? '00'}`,
  };
}

export function normalizeClock(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const latin = toLatinDigits(trimmed);
  const match = latin.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad2(String(hour))}:${pad2(String(minute))}`;
}
