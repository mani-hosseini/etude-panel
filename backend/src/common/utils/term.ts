export function normalizeTerm(value?: number | string | null) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return 1;
  return number;
}
