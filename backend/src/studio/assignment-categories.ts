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
