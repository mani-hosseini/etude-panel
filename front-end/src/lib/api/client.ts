const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api/v1";

export type ApiErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccessPayload<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
};

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

async function parseResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as
    | ApiSuccessPayload<T>
    | ApiErrorPayload;

  if (!response.ok || !("success" in json) || json.success === false) {
    const err = json as ApiErrorPayload;
    throw new ApiError(
      response.status,
      err.error?.code ?? "UNKNOWN",
      err.error?.message ?? "خطای ناشناخته از سرور",
    );
  }

  return json.data;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = await parseResponse<{
    accessToken: string;
    refreshToken: string;
  }>(response);

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const useAuth = options.auth !== false;
  let token = options.token ?? (useAuth ? getStoredAccessToken() : null);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const doFetch = () =>
    fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let response = await doFetch();

  if (response.status === 401 && useAuth && getStoredRefreshToken()) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      headers.Authorization = `Bearer ${nextToken}`;
      response = await doFetch();
    }
  }

  return parseResponse<T>(response);
}

import type {
  DashboardPayload,
  ProfilePayload,
  SchedulePayload,
  SessionsPayload,
  CourseSession,
  CourseCard,
  ApiSlide,
} from "@/lib/api/types";

export const api = {
  login: (body: {
    firstName: string;
    lastName: string;
    password: string;
  }) =>
    apiRequest<{
      accessToken: string;
      refreshToken: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
      };
    }>("/auth/login", { method: "POST", body, auth: false }),

  logout: (refreshToken: string) =>
    apiRequest<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),

  register: (body: {
    firstName: string;
    lastName: string;
    password: string;
    confirmPassword: string;
  }) =>
    apiRequest<{
      accessToken: string;
      refreshToken: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
      };
    }>("/auth/register", { method: "POST", body, auth: false }),

  me: () =>
    apiRequest<{
      id: string;
      displayName: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
      };
    }>("/auth/me"),

  dashboard: () => apiRequest<DashboardPayload>("/dashboard"),
  courses: () =>
    apiRequest<{ courses: CourseCard[] }>("/courses"),
  course: (id: string) => apiRequest<CourseCard>(`/courses/${id}`),
  sessions: (courseId?: string) =>
    apiRequest<SessionsPayload>(
      courseId ? `/sessions?courseId=${encodeURIComponent(courseId)}` : "/sessions",
    ),
  session: (id: string, courseId?: string) =>
    apiRequest<CourseSession>(
      courseId
        ? `/sessions/${id}?courseId=${encodeURIComponent(courseId)}`
        : `/sessions/${id}`,
    ),
  sessionSlides: (id: string, courseId?: string) =>
    apiRequest<{
      sessionId: string;
      total: number;
      slides: ApiSlide[];
      courseTitle?: string;
    }>(
      courseId
        ? `/sessions/${id}/slides?courseId=${encodeURIComponent(courseId)}`
        : `/sessions/${id}/slides`,
    ),
  schedule: (courseId?: string) =>
    apiRequest<SchedulePayload>(
      courseId ? `/schedule?courseId=${encodeURIComponent(courseId)}` : "/schedule",
    ),
  profile: () => apiRequest<ProfilePayload>("/profile"),
};
