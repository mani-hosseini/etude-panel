/** Convert Latin digits to Persian digits (idempotent on already-Persian). */
export function toFa(n: string | number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
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
