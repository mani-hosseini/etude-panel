import { toLatinDigits } from '../common/utils/session-time';

export const ASSIGNMENT_CATEGORIES = [
  'تکنیک',
  'تئوری موسیقی',
  'قطعه',
  'سلفژ',
] as const;

export type AssignmentCategory = (typeof ASSIGNMENT_CATEGORIES)[number];

export const PIECE_CATEGORY = 'قطعه' satisfies AssignmentCategory;

export function isPieceCategory(value: string) {
  return value.trim() === PIECE_CATEGORY;
}

function lessonToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const latin = toLatinDigits(trimmed).replace(/\s/g, '');
  if (/^\d+$/.test(latin)) return latin;
  const prefixed = latin.match(/^(?:درس|lesson)(\d+)$/i);
  if (prefixed?.[1]) return prefixed[1];
  return trimmed;
}

/** One book can carry several lesson numbers: `درس 4، 5، 12`. */
export function joinAssignmentSource(
  source?: string | null,
  sources?: string[] | null,
): string {
  const seen = new Set<string>();
  const numbers: string[] = [];
  const texts: string[] = [];
  const take = (value?: string | null) => {
    if (!value) return;
    for (const part of value.split(/[،,]/)) {
      const token = lessonToken(part);
      if (!token || seen.has(token)) continue;
      seen.add(token);
      if (/^\d+$/.test(token)) numbers.push(token);
      else texts.push(token);
    }
  };
  take(source);
  for (const item of sources ?? []) take(item);
  const lesson = numbers.length > 0 ? `درس ${numbers.join('، ')}` : '';
  return [lesson, ...texts].filter(Boolean).join(' · ');
}
