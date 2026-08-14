/** Shared HTTP helpers for student + admin API clients. */

import { toAudienceMessage } from "@/lib/api/errors";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api/v1";

/** Origin for uploaded media (same host as API, without /api/v1). */
export const MEDIA_ORIGIN =
  process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, "") ??
  API_BASE.replace(/\/api\/v1\/?$/, "");

export function resolveMediaUrl(
  pathOrId: string | null | undefined,
): string | null {
  if (!pathOrId) return null;
  if (/^https?:\/\//i.test(pathOrId)) return pathOrId;
  if (pathOrId.startsWith("/uploads/")) return `${MEDIA_ORIGIN}${pathOrId}`;
  if (pathOrId.startsWith("uploads/")) return `${MEDIA_ORIGIN}/${pathOrId}`;
  return null;
}

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
    super(toAudienceMessage(status, code, message));
    this.status = status;
    this.code = code;
  }
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
};

type TokenStore = {
  getAccess: () => string | null;
  getRefresh: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
  /** Called after a failed refresh / expired session. Redirect; do not toast. */
  onUnauthorized?: () => void;
};

export async function parseResponseData<T>(response: Response): Promise<{
  data: T;
  meta?: PaginationMeta;
}> {
  let json: ApiSuccessPayload<T> | ApiErrorPayload;
  try {
    json = (await response.json()) as
      | ApiSuccessPayload<T>
      | ApiErrorPayload;
  } catch {
    throw new ApiError(
      response.status,
      response.status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_RESPONSE",
      "خطای ناشناخته از سرور",
    );
  }

  if (!response.ok || !("success" in json) || json.success === false) {
    const err = json as ApiErrorPayload;
    throw new ApiError(
      response.status,
      err.error?.code ?? "UNKNOWN",
      err.error?.message ?? "خطای ناشناخته از سرور",
    );
  }

  return {
    data: json.data,
    meta: json.meta as PaginationMeta | undefined,
  };
}

export function createApiRequester(store: TokenStore) {
  function expireSessionAndHang(): Promise<Response> {
    store.clearTokens();
    store.onUnauthorized?.();
    return new Promise<Response>(() => {});
  }

  async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = store.getRefresh();
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      store.clearTokens();
      return null;
    }

    const { data } = await parseResponseData<{
      accessToken: string;
      refreshToken: string;
    }>(response);

    store.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  async function authorizedFetch(
    path: string,
    init: RequestInit,
    useAuth: boolean,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    const token = useAuth ? store.getAccess() : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    let response = await fetch(url, { ...init, headers });

    if (response.status === 401 && useAuth) {
      if (store.getRefresh()) {
        let nextToken: string | null = null;
        try {
          nextToken = await refreshAccessToken();
        } catch {
          throw new ApiError(0, "NETWORK", "اتصال برقرار نشد.");
        }
        if (nextToken) {
          headers.set("Authorization", `Bearer ${nextToken}`);
          response = await fetch(url, { ...init, headers });
          if (response.status !== 401) return response;
        }
      }
      return expireSessionAndHang();
    }

    return response;
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ data: T; meta?: PaginationMeta }> {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const useAuth = options.auth !== false;
    let response: Response;
    try {
      response = await authorizedFetch(
        path,
        {
          method: options.method ?? (options.body ? "POST" : "GET"),
          headers,
          body:
            options.body !== undefined ? JSON.stringify(options.body) : undefined,
        },
        useAuth,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "NETWORK", "اتصال برقرار نشد.");
    }

    return parseResponseData<T>(response);
  }

  async function upload<T>(
    path: string,
    formData: FormData,
    options: { method?: string; auth?: boolean } = {},
  ): Promise<T> {
    const useAuth = options.auth !== false;
    let response: Response;
    try {
      response = await authorizedFetch(
        path,
        {
          method: options.method ?? "POST",
          body: formData,
        },
        useAuth,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "NETWORK", "اتصال برقرار نشد.");
    }
    const { data } = await parseResponseData<T>(response);
    return data;
  }

  return {
    request,
    requestData: async <T>(path: string, options?: RequestOptions) => {
      const { data } = await request<T>(path, options);
      return data;
    },
    upload,
  };
}
