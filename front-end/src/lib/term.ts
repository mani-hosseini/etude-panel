export function parseTerm(value?: string | number | null): number | undefined {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return undefined;
  return number;
}

export function normalizeTerm(value?: string | number | null) {
  return parseTerm(value) ?? 1;
}
