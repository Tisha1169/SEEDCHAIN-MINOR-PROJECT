import { ApiError, customFetch } from "@workspace/api-client-react";

/** Human-readable message from any thrown API/network error. */
export function errMsg(err: unknown): string {
  if (err instanceof ApiError) {
    const d = err.data as { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> } | null;
    const detail = d?.details?.[0]?.message ? ` (${(d.details[0].path ?? []).join(".")}: ${d.details[0].message})` : "";
    return `${d?.error ?? err.statusText ?? "Request failed"}${detail}`;
  }
  if (err instanceof TypeError) return "Cannot reach the server. Check your connection.";
  return err instanceof Error ? err.message : "Something went wrong";
}

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (typeof navigator !== "undefined" && navigator.onLine === false);
}

export function isApiStatus(err: unknown, ...statuses: number[]): boolean {
  return err instanceof ApiError && statuses.includes(err.status);
}

export const uuid = (): string => crypto.randomUUID();

export interface RequestSpec {
  url: string;
  method: "POST" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
}

/** Direct JSON request used for idempotent / offline-capable mutations. */
export function apiRequest<T>(spec: RequestSpec): Promise<T> {
  return customFetch<T>(spec.url, {
    method: spec.method,
    headers: { "Content-Type": "application/json", ...(spec.headers ?? {}) },
    body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
  });
}
