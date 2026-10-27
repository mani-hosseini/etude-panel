import {
  clearTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setTokens,
  api,
  ApiError,
} from "@/lib/api/client";
import { routes, teacherRoutes } from "@/lib/routes";

export type SessionAudience = "student" | "teacher";

export type EtudeSession = {
  firstName: string;
  lastName: string;
  displayName: string;
  loggedInAt: string;
  studentCode?: string | null;
  audience: SessionAudience;
};

export function sessionHome(session: EtudeSession) {
  return session.audience === "teacher" ? teacherRoutes.root : routes.dashboard;
}

export function isTeacherSession(session: EtudeSession | null | undefined) {
  return session?.audience === "teacher";
}

const STORAGE_KEY = "etude-panel-session-v2";

const persianNameRegex = /^[\u0600-\u06FF\u200c\s]{2,40}$/;

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSession: EtudeSession | null = null;

export function isPersianName(value: string) {
  return persianNameRegex.test(value.trim());
}

export function createSession(firstName: string, lastName: string): EtudeSession {
  const first = firstName.trim();
  const last = lastName.trim();
  return {
    firstName: first,
    lastName: last,
    displayName: `${first} ${last}`,
    loggedInAt: new Date().toISOString(),
    audience: "student",
  };
}

function parseSession(raw: string | null): EtudeSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EtudeSession>;
    if (parsed.firstName && parsed.lastName && parsed.displayName) {
      const audience: SessionAudience =
        parsed.audience === "teacher" ? "teacher" : "student";
      return {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: parsed.displayName,
        loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
        studentCode: parsed.studentCode ?? null,
        audience,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function saveSession(session: EtudeSession) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSession = session;
  emitChange();
}

export function getSession(): EtudeSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  cachedSession = parseSession(raw);
  return cachedSession;
}

export function getServerSession(): EtudeSession | null {
  return null;
}

export function subscribeSession(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedSession = null;
  clearTokens();
  emitChange();
}

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function normalizeNationalId(value: string) {
  return value
    .trim()
    .replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch)
    .replace(/\D/g, "");
}

export type LoginPayload =
  | { username: string; password: string }
  | { firstName: string; lastName: string; password: string };

export async function loginWithApi(payload: LoginPayload) {
  try {
    const result = await api.login(
      "username" in payload
        ? {
            username: normalizeNationalId(payload.username) || payload.username.trim(),
            password: normalizeNationalId(payload.password) || payload.password,
          }
        : {
            firstName: payload.firstName.trim(),
            lastName: payload.lastName.trim(),
            password: payload.password,
          },
    );
    setTokens(result.accessToken, result.refreshToken);
    saveSession({
      firstName: result.session.firstName,
      lastName: result.session.lastName,
      displayName: result.session.displayName,
      loggedInAt: result.session.loggedInAt,
      studentCode: result.session.studentCode,
      audience: result.session.role === "TEACHER" ? "teacher" : "student",
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false as const,
        message: error.message || "نام کاربری یا رمز عبور نادرست است.",
      };
    }
    return {
      ok: false as const,
      message: "اتصال برقرار نشد. کمی بعد دوباره تلاش کنید.",
    };
  }
}

export async function registerWithApi(
  firstName: string,
  lastName: string,
  password: string,
  confirmPassword: string,
) {
  try {
    const result = await api.register({
      firstName,
      lastName,
      password,
      confirmPassword,
    });
    setTokens(result.accessToken, result.refreshToken);
    saveSession({
      firstName: result.session.firstName,
      lastName: result.session.lastName,
      displayName: result.session.displayName,
      loggedInAt: result.session.loggedInAt,
      studentCode: result.session.studentCode,
      audience: "student",
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false as const,
        message: error.message || "ثبت‌نام انجام نشد. اطلاعات را بررسی کنید.",
      };
    }
    return {
      ok: false as const,
      message: "اتصال برقرار نشد. کمی بعد دوباره تلاش کنید.",
    };
  }
}

export async function logoutWithApi() {
  const refreshToken = getStoredRefreshToken();
  try {
    if (refreshToken && getStoredAccessToken()) {
      await api.logout(refreshToken);
    }
  } catch {
    // ignore network errors on logout
  } finally {
    clearSession();
  }
}
