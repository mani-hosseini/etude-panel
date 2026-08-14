import { createApiRequester } from "@/lib/api/http";

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

const ACCESS_KEY = "etude-admin-access-token";
const REFRESH_KEY = "etude-admin-refresh-token";

export function getAdminAccessToken() {
  if (typeof window === "undefined") return accessTokenMemory;
  return window.localStorage.getItem(ACCESS_KEY) ?? accessTokenMemory;
}

export function getAdminRefreshToken() {
  if (typeof window === "undefined") return refreshTokenMemory;
  return window.localStorage.getItem(REFRESH_KEY) ?? refreshTokenMemory;
}

export function setAdminTokens(accessToken: string, refreshToken: string) {
  accessTokenMemory = accessToken;
  refreshTokenMemory = refreshToken;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearAdminTokens() {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

function redirectAdminToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/admin/login") return;
  window.localStorage.removeItem("etude-admin-session-v1");
  window.location.replace("/admin/login");
}

export const adminHttp = createApiRequester({
  getAccess: getAdminAccessToken,
  getRefresh: getAdminRefreshToken,
  setTokens: setAdminTokens,
  clearTokens: clearAdminTokens,
  onUnauthorized: redirectAdminToLogin,
});
