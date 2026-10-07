import { describe, expect, it } from "vitest";
import {
  allowedOrderActions,
  checkOrderTransition,
  deriveLotStatus,
  assertLotTransition,
  ORDER_ACTIONS,
  ORDER_STATUSES,
  TransitionError,
  type FulfillmentMethod,
  type OrderStatus,
  type Role,
} from "../src/domain/state-machine";
import { assessRisk, levelForScore, type RiskInput } from "../src/domain/risk";
import { buildTraceUrl, extractTokenFromPayload, formatLotCode, generatePublicToken, isWellFormedToken } from "../src/domain/qr";
import { toPublicTimeline } from "../src/domain/public-trace";
import { normaliseMarketRecord, parseIndianDate, redactUrl, describeWeatherCode } from "../src/services/external/ingestion";

describe("QR identity", () => {
  it("generates 256-bit unguessable, unique, URL-safe tokens", () => {
    const tokens = new Set(Array.from({ length: 5000 }, generatePublicToken));
    expect(tokens.size).toBe(5000);
    for (const t of [...tokens].slice(0, 50)) {
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(t, "base64url").length).toBe(32);
    }
  });

  it("encodes only the HTTPS trace URL", () => {
    const t = generatePublicToken();
    expect(buildTraceUrl("https://seedchain.example/", t)).toBe(`https://seedchain.example/trace/${t}`);
  });

  it("extracts tokens only from allowed origins and valid paths", () => {
    const t = generatePublicToken();
    const allowed = ["https://seedchain.example"];
    expect(extractTokenFromPayload(`https://seedchain.example/trace/${t}`, allowed)).toBe(t);
    expect(extractTokenFromPayload(t, allowed)).toBe(t);
    expect(extractTokenFromPayload(`https://evil.example/trace/${t}`, allowed)).toBeNull();
    expect(extractTokenFromPayload(`https://seedchain.example/trace/${t}/../admin`, allowed)).toBeNull();
    expect(extractTokenFromPayload(`{"batchCode":"SC-1"}`, allowed)).toBeNull();
    expect(extractTokenFromPayload("hello", allowed)).toBeNull();
    expect(isWellFormedToken("short")).toBe(false);
  });

  it("formats lot codes", () => {
    expect(formatLotCode(2026, "Punjab", 1)).toBe("LOT-2026-PB-000001");
    expect(formatLotCode(2026, "Uttar Pradesh", 42n)).toBe("LOT-2026-UP-000042");
    expect(formatLotCode(2026, "Atlantis", 7)).toBe("LOT-2026-XX-000007");
  });
});

describe("order state machine", () => {
  const methods: FulfillmentMethod[] = ["CUSTOMER_PICKUP", "FARMER_DELIVERY", "THIRD_PARTY_DELIVERY"];

  it("follows the happy path for delivery", () => {
    let s: OrderStatus = "PENDING";
    const path: [string, Role][] = [
      ["accept", "farmer"],
      ["prepare", "farmer"],
      ["ready", "farmer"],
      ["dispatch", "farmer"],
      ["complete", "farmer"],
      ["confirm-receipt", "customer"],
    ];
    for (const [a, r] of path) s = checkOrderTransition(a as never, r, s, "FARMER_DELIVERY").to;
    expect(s).toBe("CUSTOMER_CONFIRMED");
  });

  it("follows the happy path for pickup (no dispatch)", () => {
    expect(() => checkOrderTransition("dispatch", "farmer", "READY", "CUSTOMER_PICKUP")).toThrow(TransitionError);
    expect(checkOrderTransition("confirm-receipt", "customer", "READY", "CUSTOMER_PICKUP").to).toBe("CUSTOMER_CONFIRMED");
    expect(checkOrderTransition("complete", "farmer", "READY", "CUSTOMER_PICKUP").to).toBe("DELIVERED");
  });

  it("never allows any action from a final state", () => {
    for (const s of ["REJECTED", "CANCELLED", "CUSTOMER_CONFIRMED"] as OrderStatus[])
      for (const r of ["admin", "farmer", "customer"] as Role[])
        for (const m of methods) expect(allowedOrderActions(r, s, m)).toEqual([]);
  });

  it("enforces role permissions", () => {
    expect(() => checkOrderTransition("accept", "customer", "PENDING", "FARMER_DELIVERY")).toThrow(/may not/);
    expect(() => checkOrderTransition("confirm-receipt", "farmer", "DELIVERED", "FARMER_DELIVERY")).toThrow(/may not/);
    expect(() => checkOrderTransition("cancel", "farmer", "PENDING", "FARMER_DELIVERY")).toThrow(/may not/);
    expect(() => checkOrderTransition("cancel", "customer", "PREPARING", "FARMER_DELIVERY")).toThrow(TransitionError);
    expect(() => checkOrderTransition("confirm-receipt", "customer", "READY", "FARMER_DELIVERY")).toThrow(TransitionError);
  });

  it("requires reasons where configured", () => {
    expect(() => checkOrderTransition("reject", "farmer", "PENDING", "FARMER_DELIVERY")).toThrow(/reason/);
    expect(() => checkOrderTransition("cancel", "admin", "READY", "FARMER_DELIVERY", " ")).toThrow(/reason/);
    expect(checkOrderTransition("cancel", "customer", "PENDING", "FARMER_DELIVERY").to).toBe("CANCELLED");
  });

  it("every allowed action is a legal transition and every other is rejected", () => {
    for (const s of ORDER_STATUSES)
      for (const r of ["admin", "farmer", "customer"] as Role[])
        for (const m of methods) {
          const allowed = new Set(allowedOrderActions(r, s, m));
          for (const a of ORDER_ACTIONS) {
            const ok = (() => {
              try {
                checkOrderTransition(a, r, s, m, "reason");
                return true;
              } catch {
                return false;
              }
            })();
            expect(ok).toBe(allowed.has(a));
          }
        }
  });
});

describe("lot status derivation", () => {
  const c = (harvested: number, reserved = 0, sold = 0, loss = 0) => ({ harvested, reserved, sold, loss });
  it("derives statuses from inventory", () => {
    expect(deriveLotStatus("CREATED", c(0), false)).toBe("CREATED");
    expect(deriveLotStatus("GROWING", c(0), false)).toBe("GROWING");
    expect(deriveLotStatus("GROWING", c(100), false)).toBe("HARVESTED");
    expect(deriveLotStatus("HARVESTED", c(100), true)).toBe("AVAILABLE");
    expect(deriveLotStatus("AVAILABLE", c(100, 100), true)).toBe("RESERVED");
    expect(deriveLotStatus("AVAILABLE", c(100, 10, 20), true)).toBe("PARTIALLY_SOLD");
    expect(deriveLotStatus("AVAILABLE", c(100, 0, 90, 10), true)).toBe("SOLD_OUT");
  });
  it("rejects illegal lot transitions", () => {
    expect(() => assertLotTransition("CREATED", "SOLD_OUT")).toThrow(TransitionError);
    expect(() => assertLotTransition("HARVESTED", "GROWING")).toThrow(TransitionError);
    expect(() => assertLotTransition("GROWING", "HARVESTED")).not.toThrow();
  });
});

describe("risk engine (rule-based, explainable)", () => {
  const base: RiskInput = {
    now: new Date("2026-10-01T00:00:00Z"),
    harvested: 1000,
    available: 800,
    loss: 0,
    qualityGrade: "A",
    qualityRecordedAt: new Date("2026-09-25T00:00:00Z"),
    harvestDate: new Date("2026-09-20T00:00:00Z"),
    storage: null,
    spoilageEventsLast30d: 0,
    stalledOrders: 0,
    weather: null,
  };
  it("is LOW for fresh grade-A stock", () => {
    const r = assessRisk(base);
    expect(r.level).toBe("LOW");
    expect(r.engine).toBe("rules-v1");
  });
  it("explains every factor that raises risk", () => {
    const r = assessRisk({
      ...base,
      qualityGrade: "B",
      qualityRecordedAt: new Date("2026-07-01T00:00:00Z"),
      storage: { storageType: "ambient", storageStart: new Date("2026-07-15T00:00:00Z"), storageEnd: null, temperatureC: 33, humidityPct: 97, storageCondition: "poor" },
      loss: 200,
      spoilageEventsLast30d: 2,
    });
    expect(["HIGH", "CRITICAL"]).toContain(r.level);
    expect(r.reasons.join("\n")).toMatch(/Storage duration/);
    expect(r.reasons.join("\n")).toMatch(/grade B/);
    expect(r.reasons.join("\n")).toMatch(/inspection/);
    expect(r.reasons.join("\n")).toMatch(/humidity/);
  });
  it("maps scores to levels", () => {
    expect(levelForScore(0)).toBe("LOW");
    expect(levelForScore(20)).toBe("MEDIUM");
    expect(levelForScore(45)).toBe("HIGH");
    expect(levelForScore(70)).toBe("CRITICAL");
  });
});

describe("public trace projection", () => {
  it("only exposes allow-listed events and never private fields", () => {
    const t = toPublicTimeline(
      [
        { eventType: "LOT_CREATED", eventTime: new Date(), quantityChange: null, location: "Nakodar, Punjab", reason: "x", isPublic: true, metadata: {} },
        { eventType: "LOT_UPDATED", eventTime: new Date(), quantityChange: null, location: null, reason: "secret", isPublic: false, metadata: { privateNotes: "S" } },
        { eventType: "ORDER_CREATED", eventTime: new Date(), quantityChange: 50, location: "Customer home address", reason: "y", isPublic: true, metadata: { customerEmail: "c@x" } },
        { eventType: "UNKNOWN_TYPE", eventTime: new Date(), quantityChange: null, location: null, reason: null, isPublic: true, metadata: {} },
      ],
      "kg",
    );
    expect(t.map((e) => e.eventType)).toEqual(["LOT_CREATED", "ORDER_CREATED"]);
    const json = JSON.stringify(t);
    expect(json).not.toMatch(/Customer home|c@x|secret|privateNotes/);
  });
});

describe("external data normalisation", () => {
  it("parses data.gov.in dates", () => {
    expect(parseIndianDate("07/10/2026")).toBe("2026-10-07");
    expect(parseIndianDate("2026-10-07")).toBe("2026-10-07");
    expect(parseIndianDate("yesterday")).toBeNull();
  });
  it("validates and normalises records, rejecting unusable ones", () => {
    const ok = normaliseMarketRecord({ state: "Punjab", district: "Jalandhar", market: "Jalandhar City", commodity: "Potato", variety: "Other", grade: "FAQ", arrival_date: "06/10/2026", min_price: "800", max_price: "1200", modal_price: "1000" });
    expect(ok).toMatchObject({ observationDate: "2026-10-06", modalPrice: 1000, arrivalQuantityTonnes: null });
    expect(normaliseMarketRecord({ state: "Punjab", market: "X", commodity: "Potato", arrival_date: "06/10/2026" })).toBeNull();
    expect(normaliseMarketRecord({ state: "Punjab", market: "X", commodity: "Potato", arrival_date: "06/10/2026", min_price: "900", max_price: "100" })).toBeNull();
  });
  it("redacts API keys from stored lineage", () => {
    expect(redactUrl("https://api.data.gov.in/resource/x?api-key=SECRET&format=json")).not.toContain("SECRET");
  });
  it("describes WMO weather codes", () => {
    expect(describeWeatherCode(0)).toBe("Clear sky");
    expect(describeWeatherCode(63)).toBe("Rain");
    expect(describeWeatherCode(null)).toBeNull();
  });
});
