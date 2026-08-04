export type EtudeSession = {
  username: string;
  displayName: string;
  loggedInAt: string;
};

const STORAGE_KEY = "etude-panel-session";

export const DEMO_CREDENTIALS = {
  username: "student",
  password: "etude123",
} as const;

export function createSession(username: string): EtudeSession {
  return {
    username,
    displayName: username === DEMO_CREDENTIALS.username ? "آوا محمدی" : username,
    loggedInAt: new Date().toISOString(),
  };
}

export function saveSession(session: EtudeSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): EtudeSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EtudeSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function validateCredentials(username: string, password: string) {
  const u = username.trim();
  const p = password.trim();
  if (!u || !p) return false;
  if (u === DEMO_CREDENTIALS.username && p === DEMO_CREDENTIALS.password) {
    return true;
  }
  // Static mode: accept any non-empty pair for local demos
  return u.length >= 3 && p.length >= 4;
}
