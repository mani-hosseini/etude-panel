/** Convert Latin digits to Persian digits (idempotent on already-Persian). */
export function toFa(n: string | number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}
