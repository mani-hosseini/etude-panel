const DEFAULT_ERROR = "الان امکان انجام این کار نیست. کمی بعد دوباره تلاش کنید.";
const NETWORK_ERROR = "اتصال برقرار نشد. کمی بعد دوباره تلاش کنید.";

const EXACT_MAP: Record<string, string> = {
  "کاربر یافت نشد.": "هنرجو یافت نشد.",
  "کاربر یافت نشد": "هنرجو یافت نشد.",
  "کاربر غیرفعال یا یافت نشد.": "حساب شما در دسترس نیست.",
  "رکورد مورد نظر یافت نشد.": "مورد نظر یافت نشد.",
  "مورد نظر یافت نشد.": "مورد نظر یافت نشد.",
  "رکورد تکراری است.": "این مورد از قبل ثبت شده است.",
  "خطای داخلی سرور رخ داد.": DEFAULT_ERROR,
  "خطای ناشناخته از سرور": DEFAULT_ERROR,
  "احراز هویت لازم است.": "",
  "توکن نامعتبر است.": "",
  "توکن تازه‌سازی نامعتبر است.": "",
  "توکن تازه‌سازی منقضی یا باطل شده است.": "",
  "توکن تازه‌سازی الزامی است.": "",
  "Not Found": "مورد نظر یافت نشد.",
  "not found": "مورد نظر یافت نشد.",
  "property level should not exist": "هنرجویی با این فیلتر پیدا نشد.",
};

function looksTechnical(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("backend") ||
    lower.includes("server") ||
    lower.includes("econnrefused") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("cannot get") ||
    lower.includes("cannot post") ||
    lower.includes("cannot patch") ||
    lower.includes("cannot delete") ||
    lower.includes("internal server") ||
    lower.includes("nestjs") ||
    /exception|stack|undefined|null is not/i.test(message)
  );
}

export function toAudienceMessage(
  status: number,
  code: string,
  raw: string,
): string {
  if (code === "AUTH_EXPIRED") {
    return "";
  }

  const trimmed = raw.trim();
  if (EXACT_MAP[trimmed] !== undefined) return EXACT_MAP[trimmed];

  if (
    /should not exist/i.test(trimmed) ||
    /must be one of/i.test(trimmed)
  ) {
    return "هنرجویی با این فیلتر پیدا نشد.";
  }

  if (status === 401 || code === "UNAUTHORIZED") {
    if (trimmed.includes("توکن") || trimmed.includes("احراز هویت")) {
      return "";
    }
    return trimmed || "ورود نامعتبر است.";
  }

  if (status === 404 || code === "NOT_FOUND") {
    if (trimmed.includes("کاربر")) return "هنرجو یافت نشد.";
    if (trimmed.includes("دوره")) return "دوره یافت نشد.";
    if (trimmed.includes("جلسه")) return "جلسه یافت نشد.";
    if (trimmed.includes("اسلاید")) return "اسلاید یافت نشد.";
    if (trimmed.includes("پیوست") || trimmed.includes("فایل")) {
      return "فایل یافت نشد.";
    }
    return trimmed || "مورد نظر یافت نشد.";
  }

  if (status >= 500 || code === "INTERNAL_SERVER_ERROR") {
    return DEFAULT_ERROR;
  }

  if (status === 0 || code === "NETWORK" || looksTechnical(trimmed)) {
    return NETWORK_ERROR;
  }

  return trimmed || DEFAULT_ERROR;
}

function isApiErrorLike(
  error: unknown,
): error is Error & { status: number; code: string } {
  return (
    error instanceof Error &&
    "status" in error &&
    "code" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

/** User-facing copy for any thrown API/network error. Empty = do not show. */
export function audienceError(error: unknown, fallback = DEFAULT_ERROR): string {
  if (isApiErrorLike(error)) {
    return error.message || fallback;
  }
  if (error instanceof Error && looksTechnical(error.message)) {
    return NETWORK_ERROR;
  }
  if (error instanceof Error && error.message.trim()) {
    return toAudienceMessage(0, "UNKNOWN", error.message) || fallback;
  }
  return fallback;
}
