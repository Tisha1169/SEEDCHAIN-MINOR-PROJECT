/**
 * Traceability completeness: "how complete is the digital record of this lot?"
 * It is NOT a food-safety, quality or certification score.
 *
 * Base components always apply. Lifecycle components apply only once the lot
 * has an order, so an unsold lot is not penalised for a sale that has not
 * happened yet. Every missing component is returned so the UI can explain it.
 */

export type CompletenessKey = "FARM" | "FARMER_VERIFIED" | "HARVEST" | "QUALITY" | "QR" | "INVENTORY" | "ORDER" | "CUSTOMER_CONFIRMATION";

export interface CompletenessInput {
  farmRecorded: boolean;
  farmerVerified: boolean;
  harvestRecorded: boolean;
  qualityRecorded: boolean;
  qrActive: boolean;
  inventoryTracked: boolean;
  hasOrder: boolean;
  customerConfirmed: boolean;
}

export interface CompletenessComponent {
  key: CompletenessKey;
  weight: number;
  applicable: boolean;
  done: boolean;
}

export interface Completeness {
  percent: number;
  components: CompletenessComponent[];
  missing: CompletenessKey[];
}

export function computeCompleteness(i: CompletenessInput): Completeness {
  const components: CompletenessComponent[] = [
    { key: "FARM", weight: 10, applicable: true, done: i.farmRecorded },
    { key: "FARMER_VERIFIED", weight: 15, applicable: true, done: i.farmerVerified },
    { key: "HARVEST", weight: 20, applicable: true, done: i.harvestRecorded },
    { key: "QUALITY", weight: 15, applicable: true, done: i.qualityRecorded },
    { key: "QR", weight: 10, applicable: true, done: i.qrActive },
    { key: "INVENTORY", weight: 10, applicable: true, done: i.inventoryTracked },
    { key: "ORDER", weight: 10, applicable: i.hasOrder, done: i.hasOrder },
    { key: "CUSTOMER_CONFIRMATION", weight: 10, applicable: i.hasOrder, done: i.customerConfirmed },
  ];
  const applicable = components.filter((c) => c.applicable);
  const total = applicable.reduce((s, c) => s + c.weight, 0);
  const got = applicable.filter((c) => c.done).reduce((s, c) => s + c.weight, 0);
  return {
    percent: total ? Math.round((got / total) * 100) : 0,
    components,
    missing: applicable.filter((c) => !c.done).map((c) => c.key),
  };
}
