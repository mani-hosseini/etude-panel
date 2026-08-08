export type EtudeSession = {
  firstName: string;
  lastName: string;
  displayName: string;
  loggedInAt: string;
};

const STORAGE_KEY = "etude-panel-session-v2";

export const MASTERCLASS_PASSWORD = "etudepiano123" as const;

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
    const parsed = JSON.parse(raw) as Partial<EtudeSession> & {
      displayName?: string;
      loggedInAt?: string;
    };
    if (parsed.firstName && parsed.lastName && parsed.displayName) {
      return {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: parsed.displayName,
        loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
      };
    }
    if (parsed.displayName) {
      const parts = parsed.displayName.trim().split(/\s+/);
      return {
        firstName: parts[0] ?? parsed.displayName,
        lastName: parts.slice(1).join(" ") || parts[0] || "",
        displayName: parsed.displayName,
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
  emitChange();
}

export function validateLogin(
  firstName: string,
  lastName: string,
  password: string,
) {
  if (!isPersianName(firstName) || !isPersianName(lastName)) return false;
  return password.trim() === MASTERCLASS_PASSWORD;
}
