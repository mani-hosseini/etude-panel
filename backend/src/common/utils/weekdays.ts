export const WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export function normalizeWeekday(value: string): string {
  const compact = value.replace(/‌/g, '').replace(/\s/g, '').trim();
  return (
    WEEKDAYS.find((day) => day.replace(/‌/g, '') === compact) ?? value.trim()
  );
}

function splitDayTokens(value: string): string[] {
  return value
    .split(/[،,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeDays(
  days?: string[] | null,
  fallbackDay?: string | null,
): string[] {
  const source =
    days && days.length > 0 ? days : fallbackDay ? [fallbackDay] : [];
  const unique = new Set<string>();
  for (const item of source) {
    for (const token of splitDayTokens(item)) {
      const normalized = normalizeWeekday(token);
      if ((WEEKDAYS as readonly string[]).includes(normalized)) {
        unique.add(normalized);
      }
    }
  }
  return WEEKDAYS.filter((day) => unique.has(day));
}

export function assignedDays(
  studentDays?: string[] | null,
  courseDays?: string[] | null,
  fallbackDay?: string | null,
): string[] {
  const allowed = normalizeDays(courseDays, fallbackDay);
  const requested = normalizeDays(studentDays);
  const kept = requested.filter((day) => allowed.includes(day));
  return kept.length > 0 ? kept : allowed;
}

export function joinDays(days: string[], fallback = 'شنبه'): string {
  return days.length > 0 ? days.join('، ') : fallback;
}

export function daysOverlap(
  studentDays: string[] | null | undefined,
  day: string,
  courseDays?: string[] | null,
): boolean {
  const assigned = studentDays && studentDays.length > 0 ? studentDays : courseDays ?? [];
  return assigned.includes(day);
}
