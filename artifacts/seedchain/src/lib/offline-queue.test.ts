import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@workspace/api-client-react";
import { queueSnapshot, submitOrQueue, syncQueue } from "./offline-queue";

const spec = (id: string) => ({ url: "/api/lots/x/events", method: "POST" as const, body: { clientEventId: id } });

function respond(status: number, body: unknown = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("offline queue", () => {
  it("sends immediately when online and queues nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respond(201, { ok: 1 })));
    const r = await submitOrQueue(spec("a"), "A", "a");
    expect(r.queued).toBe(false);
    expect(queueSnapshot()).toHaveLength(0);
  });

  it("queues on network failure and replays with the same idempotency data + replay header", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    expect((await submitOrQueue(spec("a"), "Record loss", "a")).queued).toBe(true);
    expect(queueSnapshot()).toHaveLength(1);
    expect(await syncQueue()).toBe(0); // still offline: remains pending
    expect(queueSnapshot()[0].status).toBe("PENDING");

    const f = vi.fn(() => respond(201, {}));
    vi.stubGlobal("fetch", f);
    expect(await syncQueue()).toBe(1);
    expect(queueSnapshot()).toHaveLength(0);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("x-offline-replay")).toBe("1");
    expect(JSON.parse(init.body as string).clientEventId).toBe("a");
  });

  it("marks a server-rejected action as SYNC_CONFLICT and never drops or retries it silently", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
    await submitOrQueue(spec("b"), "Loss of 50 kg", "b");
    vi.stubGlobal("fetch", vi.fn(() => respond(409, { error: "Loss exceeds available stock" })));
    await syncQueue();
    const [item] = queueSnapshot();
    expect(item.status).toBe("SYNC_CONFLICT");
    expect(item.error).toMatch(/exceeds/);
    const f = vi.fn(() => respond(201));
    vi.stubGlobal("fetch", f);
    await syncQueue();
    expect(f).not.toHaveBeenCalled(); // conflicts are not auto-retried
  });

  it("keeps actions queued (in order) while the server is failing with 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
    await submitOrQueue(spec("c1"), "one", "c1");
    await submitOrQueue(spec("c2"), "two", "c2");
    vi.stubGlobal("fetch", vi.fn(() => respond(503, { error: "down" })));
    expect(await syncQueue()).toBe(0);
    expect(queueSnapshot().map((q) => q.id)).toEqual(["c1", "c2"]);
  });

  it("surfaces validation errors instead of queueing them", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respond(400, { error: "Invalid request" })));
    await expect(submitOrQueue(spec("d"), "D", "d")).rejects.toBeInstanceOf(ApiError);
    expect(queueSnapshot()).toHaveLength(0);
  });
});
