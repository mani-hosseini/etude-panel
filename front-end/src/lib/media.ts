export const EXERCISE_MAX_BYTES = 10 * 1024 * 1024;

export function isPdfFile(mimeType: string, filename?: string) {
  return (
    mimeType === "application/pdf" ||
    (filename?.toLowerCase().endsWith(".pdf") ?? false)
  );
}
