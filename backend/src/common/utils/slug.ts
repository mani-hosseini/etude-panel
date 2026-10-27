import { isUuid } from './mappers';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const WORD_MAP: Array<[RegExp, string]> = [
  [/پیانو/g, 'piano'],
  [/گیتار/g, 'guitar'],
  [/ویولنسل|ویلنسل/g, 'cello'],
  [/ویولن/g, 'violin'],
  [/سلفژ/g, 'solfege'],
  [/تئوری|نظری/g, 'theory'],
  [/موسیقی/g, 'music'],
  [/آواز|اواز/g, 'vocal'],
  [/هارمونی/g, 'harmony'],
  [/ریتم/g, 'rhythm'],
  [/کلاس/g, 'class'],
  [/دوره/g, 'course'],
  [/مقدماتی/g, 'beginner'],
  [/متوسط/g, 'intermediate'],
  [/پیشرفته/g, 'advanced'],
  [/خصوصی/g, 'private'],
  [/عمومی/g, 'group'],
  [/رشیدیان/g, 'rashidian'],
  [/اتود/g, 'etude'],
];

const LETTER_MAP: Record<string, string> = {
  ا: 'a',
  آ: 'a',
  أ: 'a',
  إ: 'e',
  ب: 'b',
  پ: 'p',
  ت: 't',
  ث: 's',
  ج: 'j',
  چ: 'ch',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  ژ: 'zh',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'z',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ک: 'k',
  ك: 'k',
  گ: 'g',
  ل: 'l',
  م: 'm',
  ن: 'n',
  و: 'o',
  ه: 'h',
  ة: 'h',
  ی: 'i',
  ي: 'i',
  ئ: 'y',
  ؤ: 'o',
  ء: '',
};

function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const persian = PERSIAN_DIGITS.indexOf(ch);
    if (persian >= 0) return String(persian);
    const arabic = ARABIC_DIGITS.indexOf(ch);
    return arabic >= 0 ? String(arabic) : ch;
  });
}

/** URL slug: always ASCII English (Persian titles are romanized). */
export function slugify(input: string, fallback = 'item'): string {
  let text = toAsciiDigits(input)
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/‌/g, '');
  for (const [pattern, latin] of WORD_MAP) {
    text = text.replace(pattern, latin);
  }
  text = text
    .split('')
    .map((ch) => LETTER_MAP[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return text || fallback;
}

export function isEnglishSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Keys to try when looking up a course by slug or UUID from a URL/query. */
export function courseLookupKeys(idOrSlug: string): string[] {
  const raw = idOrSlug.trim();
  if (!raw) return [];
  const keys = new Set<string>([raw]);
  let cursor = raw;
  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(cursor)) break;
    try {
      cursor = decodeURIComponent(cursor);
      keys.add(cursor);
    } catch {
      break;
    }
  }
  for (const key of [...keys]) {
    const normalized = key.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    keys.add(normalized);
    keys.add(slugify(normalized));
  }
  return [...keys].filter(Boolean);
}

export function courseIdentityWhere(idOrSlug: string): {
  OR: Array<{ id: string } | { slug: { in: string[] } }>;
} {
  const keys = courseLookupKeys(idOrSlug);
  const uuidKey = keys.find((key) => isUuid(key));
  return {
    OR: [
      ...(uuidKey ? [{ id: uuidKey }] : []),
      { slug: { in: keys } },
    ],
  };
}

export async function uniqueSlug(
  source: string,
  taken: (slug: string) => Promise<boolean>,
  fallback = 'item',
): Promise<string> {
  const base = slugify(source, fallback);
  if (!(await taken(base))) return base;
  for (let index = 2; index < 80; index += 1) {
    const candidate = `${base.slice(0, 44)}-${index}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}
