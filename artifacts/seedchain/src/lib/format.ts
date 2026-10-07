import i18n, { currentLocale } from "@/i18n";

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(currentLocale(), { dateStyle: "medium", timeStyle: "short" }) : "—";
export const dateOnly = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(currentLocale(), { dateStyle: "medium" }) : "—";
export const qty = (n: number | null | undefined, unit = "kg") =>
  n == null ? "—" : `${n.toLocaleString(currentLocale(), { maximumFractionDigits: 3 })} ${unitLabel(unit)}`;
export const inr = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString(currentLocale(), { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const titleCase = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Units such as kg/quintal are translated when a translation exists, otherwise shown as stored. */
export const unitLabel = (u: string) => i18n.t(`enums.unit.${u}`, { defaultValue: u });

/** Label for an enum value (order/lot status, risk, fulfilment, event types…); falls back to a readable form of the raw value. */
export const enumLabel = (kind: string, value: string | null | undefined) =>
  value ? i18n.t(`enums.${kind}.${value}`, { defaultValue: titleCase(value) }) : "—";

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return i18n.t("time.justNow");
  if (s < 3600) return i18n.t("time.minAgo", { n: Math.floor(s / 60) });
  if (s < 86400) return i18n.t("time.hAgo", { n: Math.floor(s / 3600) });
  return i18n.t("time.dAgo", { n: Math.floor(s / 86400) });
}

export const ORDER_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-400/15 text-amber-300",
  ACCEPTED: "bg-sky-400/15 text-sky-300",
  PREPARING: "bg-sky-400/15 text-sky-300",
  READY: "bg-indigo-400/15 text-indigo-300",
  DISPATCHED: "bg-violet-400/15 text-violet-300",
  DELIVERED: "bg-teal-400/15 text-teal-300",
  CUSTOMER_CONFIRMED: "bg-emerald-400/15 text-emerald-300",
  REJECTED: "bg-rose-400/15 text-rose-300",
  CANCELLED: "bg-zinc-400/15 text-zinc-300",
};

export const LOT_STATUS_STYLE: Record<string, string> = {
  CREATED: "bg-zinc-400/15 text-zinc-300",
  GROWING: "bg-lime-400/15 text-lime-300",
  HARVESTED: "bg-sky-400/15 text-sky-300",
  AVAILABLE: "bg-emerald-400/15 text-emerald-300",
  RESERVED: "bg-amber-400/15 text-amber-300",
  PARTIALLY_SOLD: "bg-indigo-400/15 text-indigo-300",
  SOLD_OUT: "bg-zinc-400/15 text-zinc-300",
};

export const RISK_STYLE: Record<string, string> = {
  LOW: "bg-emerald-400/15 text-emerald-300",
  MEDIUM: "bg-amber-400/15 text-amber-300",
  HIGH: "bg-orange-400/15 text-orange-300",
  CRITICAL: "bg-rose-400/15 text-rose-300",
};

