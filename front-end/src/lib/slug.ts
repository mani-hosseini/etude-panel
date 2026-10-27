const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const WORD_MAP: Array<[RegExp, string]> = [
  [/پیانو/g, "piano"],
  [/گیتار/g, "guitar"],
  [/ویولنسل|ویلنسل/g, "cello"],
  [/ویولن/g, "violin"],
  [/سلفژ/g, "solfege"],
  [/تئوری|نظری/g, "theory"],
  [/موسیقی/g, "music"],
  [/آواز|اواز/g, "vocal"],
  [/هارمونی/g, "harmony"],
  [/ریتم/g, "rhythm"],
  [/کلاس/g, "class"],
  [/دوره/g, "course"],
  [/مقدماتی/g, "beginner"],
  [/متوسط/g, "intermediate"],
  [/پیشرفته/g, "advanced"],
  [/خصوصی/g, "private"],
  [/عمومی/g, "group"],
  [/رشیدیان/g, "rashidian"],
  [/اتود/g, "etude"],
];

const LETTER_MAP: Record<string, string> = {
  ا: "a",
  آ: "a",
  أ: "a",
  إ: "e",
  ب: "b",
  پ: "p",
  ت: "t",
  ث: "s",
  ج: "j",
  چ: "ch",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  ژ: "zh",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "z",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ک: "k",
  ك: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  و: "o",
  ه: "h",
  ة: "h",
  ی: "i",
  ي: "i",
  ئ: "y",
  ؤ: "o",
  ء: "",
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
export function slugify(input: string, fallback = "item"): string {
  let text = toAsciiDigits(input)
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, "");
  for (const [pattern, latin] of WORD_MAP) {
    text = text.replace(pattern, latin);
  }
  text = text
    .split("")
    .map((ch) => LETTER_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return text || fallback;
}

/** Decode a course slug from a route/query param (Next may leave it encoded). */
export function decodeCourseParam(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  let current = value.trim();
  if (!current) return undefined;
  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(current)) break;
    try {
      current = decodeURIComponent(current);
    } catch {
      break;
    }
  }
  const normalized = current.replace(/ي/g, "ی").replace(/ك/g, "ک");
  return slugify(normalized) || normalized || undefined;
}
