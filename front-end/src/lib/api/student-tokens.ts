import { createApiRequester } from "@/lib/api/http";

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

const ACCESS_KEY = "etude-access-token";
const REFRESH_KEY = "etude-refresh-token";

export function getStoredAccessToken() {
  if (typeof window === "undefined") return accessTokenMemory;
  return window.localStorage.getItem(ACCESS_KEY) ?? accessTokenMemory;
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return refreshTokenMemory;
  return window.localStorage.getItem(REFRESH_KEY) ?? refreshTokenMemory;
}

export function setTokens(accessToken: string, refreshToken: string) {
  accessTokenMemory = accessToken;
  refreshTokenMemory = refreshToken;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearTokens() {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

export const studentHttp = createApiRequester({
  getAccess: getStoredAccessToken,
  getRefresh: getStoredRefreshToken,
  setTokens,
  clearTokens,
});
