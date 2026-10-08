/**
 * Projection of private traceability events into the public QR timeline.
 *
 * Allow-list based: only event types listed here are ever shown, and only
 * the fields chosen here leave the server. Customer identities, delivery
 * addresses, GPS points, private notes, actor ids and order ids are never
 * included.
 */

export interface PrivateEventLike {
  eventType: string;
  eventTime: Date;
  quantityChange: number | null;
  location: string | null;
  reason: string | null;
  isPublic: boolean;
  metadata: Record<string, unknown>;
}

export interface PublicTimelineEntry {
  eventType: string;
  label: string;
  eventTime: string;
  quantityChange: number | null;
  location: string | null;
  detail: string | null;
}

type Projector = (e: PrivateEventLike, unit: string) => Omit<PublicTimelineEntry, "eventType" | "eventTime">;

const qty = (n: number | null, unit: string) => (n == null ? null : `${Math.abs(n)} ${unit}`);

const PROJECTORS: Record<string, Projector> = {
  LOT_CREATED: (e) => ({ label: "Lot registered by farmer", quantityChange: null, location: e.location, detail: null }),
  GROWING_RECORDED: (e) => ({ label: "Crop growing", quantityChange: null, location: e.location, detail: null }),
  HARVEST_RECORDED: (e, u) => ({ label: "Harvest recorded", quantityChange: e.quantityChange, location: e.location, detail: qty(e.quantityChange, u) }),
  QUALITY_RECORDED: (e) => ({
    label: "Quality recorded",
    quantityChange: null,
    location: null,
    detail: typeof e.metadata.qualityGrade === "string" ? `Grade ${e.metadata.qualityGrade}` : null,
  }),
  STORAGE_RECORDED: (e) => ({
    label: "Storage recorded by farmer",
    quantityChange: null,
    location: null,
    detail: typeof e.metadata.storageType === "string" ? String(e.metadata.storageType).replace(/_/g, " ") : null,
  }),
  QR_GENERATED: () => ({ label: "QR identity issued", quantityChange: null, location: null, detail: null }),
  QR_REPLACED: () => ({ label: "QR label replaced", quantityChange: null, location: null, detail: null }),
  QR_DISABLED: () => ({ label: "QR temporarily disabled for review", quantityChange: null, location: null, detail: null }),
  QR_ENABLED: () => ({ label: "QR re-enabled after review", quantityChange: null, location: null, detail: null }),
  LOT_RECALLED: (e) => ({ label: "Lot recalled", quantityChange: null, location: null, detail: typeof e.metadata.publicMessage === "string" ? e.metadata.publicMessage : null }),
  LOT_RECALL_CLEARED: () => ({ label: "Recall cleared", quantityChange: null, location: null, detail: null }),
  QR_REVOKED: () => ({ label: "A QR label for this lot was revoked", quantityChange: null, location: null, detail: null }),
  QR_SCANNED: () => ({ label: "First verified scan", quantityChange: null, location: null, detail: null }),
  LOT_AVAILABLE: () => ({ label: "Listed for customers by farmer", quantityChange: null, location: null, detail: null }),
  LOT_UNLISTED: () => ({ label: "Listing paused by farmer", quantityChange: null, location: null, detail: null }),
  ORDER_CREATED: (e, u) => ({ label: "Customer order placed", quantityChange: e.quantityChange, location: null, detail: qty(e.quantityChange, u) }),
  ORDER_ACCEPTED: () => ({ label: "Order accepted by farmer", quantityChange: null, location: null, detail: null }),
  ORDER_PREPARED: () => ({ label: "Order being prepared", quantityChange: null, location: null, detail: null }),
  ORDER_READY: () => ({ label: "Order ready", quantityChange: null, location: null, detail: null }),
  ORDER_DISPATCHED: () => ({ label: "Dispatch recorded", quantityChange: null, location: null, detail: null }),
  CUSTOMER_PICKUP: () => ({ label: "Handed over to customer at pickup", quantityChange: null, location: null, detail: null }),
  DELIVERY_COMPLETED: () => ({ label: "Delivery / handover completed", quantityChange: null, location: null, detail: null }),
  CUSTOMER_RECEIVED: (e, u) => ({ label: "Customer confirmed receipt", quantityChange: e.quantityChange, location: null, detail: qty(e.quantityChange, u) }),
  ORDER_REJECTED: () => ({ label: "Order declined; stock released", quantityChange: null, location: null, detail: null }),
  ORDER_CANCELLED: () => ({ label: "Order cancelled; stock released", quantityChange: null, location: null, detail: null }),
  LOSS_RECORDED: (e, u) => ({ label: "Loss recorded", quantityChange: e.quantityChange, location: null, detail: qty(e.quantityChange, u) }),
  SPOILAGE_RECORDED: (e, u) => ({ label: "Spoilage recorded", quantityChange: e.quantityChange, location: null, detail: qty(e.quantityChange, u) }),
  CORRECTION_RECORDED: (e) => ({ label: "Correction recorded", quantityChange: e.quantityChange, location: null, detail: null }),
  ORDER_PAID: (e, u) => ({ label: "Customer order placed (payment confirmed)", quantityChange: e.quantityChange, location: null, detail: qty(e.quantityChange, u) }),
  PACKAGES_CREATED: (e) => ({ label: "Packed in sealed packages", quantityChange: null, location: null, detail: typeof e.metadata.count === "number" ? `${e.metadata.count} package(s) with serialised tamper-evident seals` : null }),
  SEAL_VERIFIED_AT_DISPATCH: () => ({ label: "Package seals verified at dispatch", quantityChange: null, location: null, detail: null }),
  SEAL_INTEGRITY_EXCEPTION: (e) => ({ label: "Seal integrity exception recorded", quantityChange: null, location: null, detail: typeof e.reason === "string" ? e.reason : null }),
  SEAL_REPLACED: (e) => ({ label: "A package seal was replaced and recorded", quantityChange: null, location: null, detail: typeof e.reason === "string" ? e.reason : null }),
  LOT_SOLD_OUT: () => ({ label: "Lot sold out", quantityChange: null, location: null, detail: null }),
};

export const PUBLIC_EVENT_TYPES = Object.keys(PROJECTORS);

export function toPublicTimeline(events: PrivateEventLike[], unit: string): PublicTimelineEntry[] {
  const out: PublicTimelineEntry[] = [];
  for (const e of events) {
    if (!e.isPublic) continue;
    const p = PROJECTORS[e.eventType];
    if (!p) continue;
    out.push({ eventType: e.eventType, eventTime: e.eventTime.toISOString(), ...p(e, unit) });
  }
  return out;
}
