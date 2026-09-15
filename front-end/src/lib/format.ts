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

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return toFa(0) + " بایت";
  if (bytes < 1024) return `${toFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) {
    return `${toFa((bytes / 1024).toFixed(1))} کیلوبایت`;
  }
  return `${toFa((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export function formatDateTimeFa(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Exam grade is out of 100. */
export const EXAM_SCORE_MAX = 100;

export function formatExamScoreValue(score: number): string {
  const raw = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return toFa(raw).replace(".", "٫");
}

export function formatExamScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${formatExamScoreValue(score)} از ${toFa(EXAM_SCORE_MAX)}`;
}

export function displayPdfName(
  name: string | null | undefined,
  fallback: string,
): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  if (
    /^(exam|answer|submission|exercise|attachment|slide)-[a-z0-9]+-[a-f0-9]{6,}\.[a-z0-9]+$/i.test(
      trimmed,
    )
  ) {
    return fallback;
  }
  return trimmed;
}
