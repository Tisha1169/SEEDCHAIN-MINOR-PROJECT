/**
 * Public journey: the fixed sequence of lifecycle steps, each marked DONE only
 * if a matching event exists in the database. A step with no event is PENDING
 * ("not recorded"); it is never shown as completed.
 */

export type JourneyKey = "FARM" | "HARVEST" | "QUALITY" | "QR" | "LISTING" | "ORDER" | "DISPATCH" | "CONFIRMATION";

export interface JourneyStep {
  key: JourneyKey;
  state: "DONE" | "PENDING";
  at: string | null;
}

const STEPS: Array<{ key: JourneyKey; types: string[] }> = [
  { key: "FARM", types: ["LOT_CREATED"] },
  { key: "HARVEST", types: ["HARVEST_RECORDED"] },
  { key: "QUALITY", types: ["QUALITY_RECORDED"] },
  { key: "QR", types: ["QR_GENERATED"] },
  { key: "LISTING", types: ["LOT_AVAILABLE"] },
  { key: "ORDER", types: ["ORDER_CREATED"] },
  { key: "DISPATCH", types: ["ORDER_DISPATCHED", "CUSTOMER_PICKUP", "DELIVERY_COMPLETED"] },
  { key: "CONFIRMATION", types: ["CUSTOMER_RECEIVED"] },
];

export function buildJourney(events: Array<{ eventType: string; eventTime: Date }>): JourneyStep[] {
  return STEPS.map(({ key, types }) => {
    const hit = events.filter((e) => types.includes(e.eventType)).sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime())[0];
    return { key, state: hit ? "DONE" : "PENDING", at: hit ? hit.eventTime.toISOString() : null };
  });
}
