/**
 * Backend-enforced state machines. The frontend only *displays* allowed
 * actions (computed here); it can never move an entity on its own.
 */

export type Role = "admin" | "farmer" | "customer";

export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CUSTOMER_CONFIRMED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type FulfillmentMethod = "CUSTOMER_PICKUP" | "FARMER_DELIVERY" | "THIRD_PARTY_DELIVERY";

export const ORDER_ACTIONS = [
  "accept",
  "reject",
  "prepare",
  "ready",
  "dispatch",
  "complete",
  "cancel",
  "confirm-receipt",
] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

export const FINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set(["REJECTED", "CANCELLED", "CUSTOMER_CONFIRMED"]);

interface ActionRule {
  from: readonly OrderStatus[];
  to: OrderStatus;
  roles: readonly Role[];
  /** Restricts the action to particular fulfilment methods. */
  methods?: readonly FulfillmentMethod[];
  /** Traceability event written for the transition. */
  event: string;
  /** Inventory effect on each order line. */
  inventory: "release" | "sell" | "none";
  requiresReason?: Role[];
}

/**
 * Transition table. "complete" means the farmer has handed over the produce
 * (delivery completed or pickup handed over). "confirm-receipt" is the
 * customer's acknowledgement and is the point at which reserved stock
 * becomes sold.
 */
export const ORDER_RULES: Record<OrderAction, ActionRule> = {
  accept: { from: ["PENDING"], to: "ACCEPTED", roles: ["farmer"], event: "ORDER_ACCEPTED", inventory: "none" },
  reject: {
    from: ["PENDING"],
    to: "REJECTED",
    roles: ["farmer"],
    event: "ORDER_REJECTED",
    inventory: "release",
    requiresReason: ["farmer"],
  },
  prepare: { from: ["ACCEPTED"], to: "PREPARING", roles: ["farmer"], event: "ORDER_PREPARED", inventory: "none" },
  ready: { from: ["PREPARING"], to: "READY", roles: ["farmer"], event: "ORDER_READY", inventory: "none" },
  dispatch: {
    from: ["READY"],
    to: "DISPATCHED",
    roles: ["farmer"],
    methods: ["FARMER_DELIVERY", "THIRD_PARTY_DELIVERY"],
    event: "ORDER_DISPATCHED",
    inventory: "none",
  },
  complete: { from: ["READY", "DISPATCHED"], to: "DELIVERED", roles: ["farmer"], event: "DELIVERY_COMPLETED", inventory: "none" },
  cancel: {
    from: ["PENDING", "ACCEPTED", "PREPARING", "READY"],
    to: "CANCELLED",
    roles: ["customer", "admin"],
    event: "ORDER_CANCELLED",
    inventory: "release",
    requiresReason: ["admin"],
  },
  "confirm-receipt": {
    from: ["READY", "DISPATCHED", "DELIVERED"],
    to: "CUSTOMER_CONFIRMED",
    roles: ["customer", "admin"],
    event: "CUSTOMER_RECEIVED",
    inventory: "sell",
    requiresReason: ["admin"],
  },
};

/** Extra per-role restrictions that are not expressible as a simple table. */
function roleAllows(action: OrderAction, role: Role, status: OrderStatus, method: FulfillmentMethod): boolean {
  // Customers may only cancel before the farmer starts preparing.
  if (action === "cancel" && role === "customer" && !["PENDING", "ACCEPTED"].includes(status)) return false;
  // From READY a customer can only confirm a pickup (deliveries must be dispatched first).
  if (action === "confirm-receipt" && role === "customer" && status === "READY" && method !== "CUSTOMER_PICKUP") return false;
  // Pickup orders are handed over from READY; delivery orders are completed from DISPATCHED.
  if (action === "complete" && status === "READY" && method !== "CUSTOMER_PICKUP") return false;
  if (action === "complete" && status === "DISPATCHED" && method === "CUSTOMER_PICKUP") return false;
  return true;
}

export class TransitionError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_STATE_TRANSITION" | "FORBIDDEN_ACTION" | "REASON_REQUIRED",
  ) {
    super(message);
  }
}

export function checkOrderTransition(
  action: OrderAction,
  role: Role,
  status: OrderStatus,
  method: FulfillmentMethod,
  reason?: string | null,
): ActionRule {
  const rule = ORDER_RULES[action];
  if (!rule.roles.includes(role)) {
    throw new TransitionError(`Role ${role} may not ${action} an order`, "FORBIDDEN_ACTION");
  }
  if (!rule.from.includes(status)) {
    throw new TransitionError(`Cannot ${action} an order in status ${status}`, "INVALID_STATE_TRANSITION");
  }
  if (rule.methods && !rule.methods.includes(method)) {
    throw new TransitionError(`Cannot ${action} a ${method} order`, "INVALID_STATE_TRANSITION");
  }
  if (!roleAllows(action, role, status, method)) {
    throw new TransitionError(`Cannot ${action} a ${method} order in status ${status} as ${role}`, "INVALID_STATE_TRANSITION");
  }
  if (rule.requiresReason?.includes(role) && !reason?.trim()) {
    throw new TransitionError(`A reason is required to ${action} this order`, "REASON_REQUIRED");
  }
  return rule;
}

export function allowedOrderActions(role: Role, status: OrderStatus, method: FulfillmentMethod): OrderAction[] {
  return ORDER_ACTIONS.filter((a) => {
    try {
      checkOrderTransition(a, role, status, method, "x");
      return true;
    } catch {
      return false;
    }
  });
}

// --------------------------------------------------------------------- lots

export const LOT_STATUSES = [
  "CREATED",
  "GROWING",
  "HARVESTED",
  "AVAILABLE",
  "RESERVED",
  "PARTIALLY_SOLD",
  "SOLD_OUT",
] as const;
export type LotStatus = (typeof LOT_STATUSES)[number];

/** Legal lot status moves. Inventory-driven states are derived, never set directly by a client. */
export const LOT_TRANSITIONS: Record<LotStatus, readonly LotStatus[]> = {
  CREATED: ["GROWING", "HARVESTED"],
  GROWING: ["HARVESTED"],
  HARVESTED: ["AVAILABLE", "RESERVED", "PARTIALLY_SOLD", "SOLD_OUT"],
  AVAILABLE: ["HARVESTED", "RESERVED", "PARTIALLY_SOLD", "SOLD_OUT"],
  RESERVED: ["HARVESTED", "AVAILABLE", "PARTIALLY_SOLD", "SOLD_OUT"],
  PARTIALLY_SOLD: ["HARVESTED", "AVAILABLE", "RESERVED", "SOLD_OUT"],
  // A sold-out lot can reopen only if a correction or cancellation frees stock.
  SOLD_OUT: ["HARVESTED", "AVAILABLE", "RESERVED", "PARTIALLY_SOLD"],
};

export function assertLotTransition(from: LotStatus, to: LotStatus): void {
  if (from === to) return;
  if (!LOT_TRANSITIONS[from].includes(to)) {
    throw new TransitionError(`Lot cannot move from ${from} to ${to}`, "INVALID_STATE_TRANSITION");
  }
}

export interface InventoryCounters {
  harvested: number;
  reserved: number;
  sold: number;
  loss: number;
}

export const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function availableOf(c: InventoryCounters): number {
  return round3(c.harvested - c.reserved - c.sold - c.loss);
}

/**
 * Derives the lot status from its inventory counters and listing flag.
 * Pre-harvest statuses (CREATED/GROWING) are kept until stock exists.
 */
export function deriveLotStatus(current: LotStatus, c: InventoryCounters, listed: boolean): LotStatus {
  if (c.harvested <= 0) return current === "GROWING" ? "GROWING" : "CREATED";
  const available = availableOf(c);
  if (available <= 0) return c.reserved > 0 ? "RESERVED" : "SOLD_OUT";
  if (c.sold > 0) return "PARTIALLY_SOLD";
  if (!listed) return "HARVESTED";
  return "AVAILABLE";
}
