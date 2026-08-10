import { adminApi, type AdminPublicUser } from "@/lib/api/admin-client";
import { ApiError } from "@/lib/api/http";
import {
  clearAdminTokens,
  getAdminRefreshToken,
  setAdminTokens,
} from "@/lib/api/admin-tokens";

export type AdminSession = {
  id: string;
  displayName: string;
  email: string | null;
  role: "ADMIN";
  loggedInAt: string;
};

const STORAGE_KEY = "etude-admin-session-v1";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSession: AdminSession | null = null;

function parseSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (parsed.id && parsed.displayName && parsed.role === "ADMIN") {
      return {
        id: parsed.id,
        displayName: parsed.displayName,
        email: parsed.email ?? null,
        role: "ADMIN",
        loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
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

export function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSession = session;
  emitChange();
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  cachedSession = parseSession(raw);
  return cachedSession;
}

export function getServerAdminSession(): AdminSession | null {
  return null;
}

export function subscribeAdminSession(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedSession = null;
  clearAdminTokens();
  emitChange();
}

function sessionFromUser(user: AdminPublicUser): AdminSession {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: "ADMIN",
    loggedInAt: new Date().toISOString(),
  };
}

export async function adminLoginWithApi(email: string, password: string) {
  try {
    const result = await adminApi.login({ email, password });
    if (result.user.role !== "ADMIN") {
      return {
        ok: false as const,
        message: "فقط مدیر سیستم می‌تواند وارد این پنل شود.",
      };
    }
    setAdminTokens(result.accessToken, result.refreshToken);
    saveAdminSession(sessionFromUser(result.user));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false as const, message: error.message };
    }
    return {
      ok: false as const,
      message: "ارتباط با سرور برقرار نشد. Backend را بررسی کنید.",
    };
  }
}

export async function adminLogoutWithApi() {
  const refreshToken = getAdminRefreshToken();
  try {
    if (refreshToken) {
      await adminApi.logout(refreshToken);
    }
  } catch {
    // ignore
  } finally {
    clearAdminSession();
  }
}
