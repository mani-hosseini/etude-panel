import {
  clearTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setTokens,
  api,
  ApiError,
} from "@/lib/api/client";

export type EtudeSession = {
  firstName: string;
  lastName: string;
  displayName: string;
  loggedInAt: string;
  studentCode?: string | null;
};

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
  };
}

function parseSession(raw: string | null): EtudeSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EtudeSession>;
    if (parsed.firstName && parsed.lastName && parsed.displayName) {
      return {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: parsed.displayName,
        loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
        studentCode: parsed.studentCode ?? null,
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

export async function loginWithApi(
  firstName: string,
  lastName: string,
  password: string,
) {
  try {
    const result = await api.login({ firstName, lastName, password });
    setTokens(result.accessToken, result.refreshToken);
    saveSession({
      firstName: result.session.firstName,
      lastName: result.session.lastName,
      displayName: result.session.displayName,
      loggedInAt: result.session.loggedInAt,
      studentCode: result.session.studentCode,
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false as const,
        message: error.message || "نام یا رمز عبور نادرست است.",
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
