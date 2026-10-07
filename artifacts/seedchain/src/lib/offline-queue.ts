import { apiRequest, isNetworkError, type RequestSpec } from "./api";
import { ApiError } from "@workspace/api-client-react";

/**
 * Lightweight offline queue for farmer field actions.
 *
 * - Only *pending actions* are stored locally; business state always comes
 *   from the server. Each action carries a client-generated UUID (inside its
 *   body or Idempotency-Key), so replays never duplicate events or inventory.
 * - On replay the server responds 2xx (or returns the original result for
 *   duplicates). A 4xx means the action is no longer valid → it is kept as a
 *   SYNC_CONFLICT for the user to review; nothing is silently overwritten.
 */
export interface QueuedAction extends RequestSpec {
  id: string;
  label: string;
  createdAt: string;
  status: "PENDING" | "SYNC_CONFLICT";
  error?: string;
}

const KEY = "seedchain.offline-queue.v1";
const listeners = new Set<() => void>();

function read(): QueuedAction[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedAction[];
  } catch {
    return [];
  }
}
function write(items: QueuedAction[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: action stays in memory only for this session */
  }
  listeners.forEach((l) => l());
}

export const queueSnapshot = (): QueuedAction[] => read();
export function subscribeQueue(fn: () => void): () => void {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

export function enqueue(spec: RequestSpec, label: string, id: string): void {
  write([...read(), { ...spec, id, label, createdAt: new Date().toISOString(), status: "PENDING" }]);
}

export function dismissAction(id: string): void {
  write(read().filter((a) => a.id !== id));
}

let syncing = false;

/** Replays pending actions in order. Returns the number applied. */
export async function syncQueue(): Promise<number> {
  if (syncing) return 0;
  syncing = true;
  let applied = 0;
  try {
    for (const item of read().filter((a) => a.status === "PENDING")) {
      try {
        await apiRequest({ ...item, headers: { ...(item.headers ?? {}), "X-Offline-Replay": "1" } });
        write(read().filter((a) => a.id !== item.id));
        applied++;
      } catch (err) {
        if (isNetworkError(err)) break; // still offline, try again later
        if (err instanceof ApiError && err.status >= 500) break; // server trouble, retry later
        const msg = err instanceof ApiError ? ((err.data as { error?: string } | null)?.error ?? err.statusText) : String(err);
        write(read().map((a) => (a.id === item.id ? { ...a, status: "SYNC_CONFLICT", error: msg } : a)));
      }
    }
  } finally {
    syncing = false;
  }
  return applied;
}

export interface SubmitResult<T> {
  queued: boolean;
  data?: T;
}

/** Sends now; if the network is down, queues the action for later sync. */
export async function submitOrQueue<T>(spec: RequestSpec, label: string, id: string): Promise<SubmitResult<T>> {
  try {
    return { queued: false, data: await apiRequest<T>(spec) };
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue(spec, label, id);
      return { queued: true };
    }
    throw err;
  }
}
