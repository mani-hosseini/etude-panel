/** Repair UTF-8 names that Multer decoded as latin1 (common with Persian PDFs). */
export function decodeMulterFilename(name?: string | null): string {
  if (!name?.trim()) return '';
  const raw = name.trim();
  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    if (decoded === raw || decoded.includes('\uFFFD')) return raw;
    const origArabic = /[\u0600-\u06FF]/.test(raw);
    const decodedArabic = /[\u0600-\u06FF]/.test(decoded);
    if (!origArabic && decodedArabic) return decoded;
    return raw;
  } catch {
    return raw;
  }
}

/** Storage keys like exam-lz8kq-a1b2c3d4.pdf must never be shown to users. */
export function isGeneratedStorageName(name: string): boolean {
  return /^(exam|answer|submission|exercise|attachment|slide)-[a-z0-9]+-[a-f0-9]{6,}\.[a-z0-9]+$/i.test(
    name.trim(),
  );
}

export function sanitizeUploadOriginalName(
  name: string | null | undefined,
  fallback: string,
): string {
  const decoded = decodeMulterFilename(name);
  const cleaned = decoded
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim()
    .slice(0, 180);
  if (!cleaned || isGeneratedStorageName(cleaned)) {
    return fallback.slice(0, 255);
  }
  return cleaned.slice(0, 255);
}

export function sanitizeOriginalName(
  name: string | null | undefined,
  fallback = 'file.pdf',
): string {
  const withExt = /\.pdf$/i.test(fallback) ? fallback : `${fallback}.pdf`;
  const cleaned = sanitizeUploadOriginalName(name, withExt);
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
}

/** Prefer the UTF-8 form field from the client; fall back to Multer's name. */
export function nameFromUpload(
  file: { originalname?: string } | null | undefined,
  hinted: string | null | undefined,
  fallback: string,
): string {
  return sanitizeOriginalName(hinted || file?.originalname, fallback);
}
