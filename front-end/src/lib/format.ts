/** Convert Latin digits to Persian digits (idempotent on already-Persian). */
export function toFa(n: string | number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

function formatClock(hhmm: string): string {
  const latin = toLatinDigits(hhmm).trim();
  const [hourRaw, minuteRaw] = latin.split(":");
  const hour = String(Number(hourRaw));
  const minute = minuteRaw ?? "00";
  if (minute === "00" || minute === "0") return toFa(hour);
  return `${toFa(hour)}:${toFa(pad2(minute))}`;
}

/** e.g. 11:00 + 13:00 → «۱۱ تا ۱۳» */
export function formatTimeRange(
  start?: string | null,
  end?: string | null,
  fallback = "",
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
    start: `${pad2(match[1]!)}:${match[2] ?? "00"}`,
    end: `${pad2(match[3]!)}:${match[4] ?? "00"}`,
  };
}

/** Plural weekday for display, e.g. پنج‌شنبه → پنج‌شنبه‌ها */
export function weekdayPlural(day: string): string {
  const base = day.replace(/‌?ها$/, "").trim();
  if (!base) return day;
  return `${base}‌ها`;
}

/** Strip trailing level labels like « — سطح پایه» from course titles. */
export function cleanCourseTitle(title: string): string {
  return title
    .replace(/\s*[—\-–]\s*سطح\s*پایه\s*/g, "")
    .replace(/\s*سطح\s*پایه\s*/g, "")
    .trim();
}
