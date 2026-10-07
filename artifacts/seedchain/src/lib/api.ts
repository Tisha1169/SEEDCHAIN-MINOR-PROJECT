import i18n from "@/i18n";
import { ApiError, customFetch } from "@workspace/api-client-react";

/** Human-readable message from any thrown API/network error. */
export function errMsg(err: unknown): string {
  if (err instanceof ApiError) {
    const d = err.data as { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> } | null;
    const detail = d?.details?.[0]?.message ? ` (${(d.details[0].path ?? []).join(".")}: ${d.details[0].message})` : "";
    const code = (err.data as { code?: string } | null)?.code;
    // Known codes are translated; other server messages are shown as sent (they are specific, e.g. "Only 5 kg left").
    const known = code ? i18n.t(`errors.${code}`, { defaultValue: "" }) : "";
    return `${known || d?.error || err.statusText || i18n.t("errors.requestFailed")}${detail}`;
  }
  if (err instanceof TypeError) return i18n.t("errors.network");
  return err instanceof Error ? err.message : i18n.t("errors.generic");
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
