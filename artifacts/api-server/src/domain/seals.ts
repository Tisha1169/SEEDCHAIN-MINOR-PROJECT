import { randomBytes } from "node:crypto";

/**
 * Tamper-evident seal rules. A seal does not make tampering impossible; it makes opening a package visible, so that a
 * broken or mismatched seal becomes a recorded, investigable exception.
 */
export type SealStatus = "ASSIGNED" | "DISPATCH_VERIFIED" | "INTACT" | "BROKEN" | "REPORTED" | "REPLACED";
export type IntegrityStatus = "NOT_CHECKED" | "OK" | "EXCEPTION";
export type SealActor = "farmer" | "admin";

/** Who may move a package's seal from one state to another. Public reports go through reportSealIssue, not this table. */
export const SEAL_TRANSITIONS: Record<SealStatus, Partial<Record<SealStatus, SealActor[]>>> = {
  ASSIGNED: { DISPATCH_VERIFIED: ["farmer", "admin"], BROKEN: ["admin"], REPORTED: ["admin"] },
  DISPATCH_VERIFIED: { INTACT: ["admin"], BROKEN: ["admin"], REPORTED: ["admin"], REPLACED: ["farmer", "admin"] },
  INTACT: { BROKEN: ["admin"], REPORTED: ["admin"], REPLACED: ["admin"] },
  REPORTED: { INTACT: ["admin"], BROKEN: ["admin"], REPLACED: ["admin"] },
  BROKEN: { REPLACED: ["farmer", "admin"] },
  REPLACED: { DISPATCH_VERIFIED: ["farmer", "admin"] },
};

export function canTransitionSeal(from: SealStatus, to: SealStatus, role: SealActor): boolean {
  return !!SEAL_TRANSITIONS[from][to]?.includes(role);
}

/** Integrity is derived from the seal state, never set independently. */
export function integrityOf(s: SealStatus): IntegrityStatus {
  if (s === "DISPATCH_VERIFIED" || s === "INTACT") return "OK";
  if (s === "ASSIGNED") return "NOT_CHECKED";
  return "EXCEPTION"; // REPORTED, BROKEN, REPLACED stay exceptions until a new seal is verified
}

const SEAL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L: printable and readable on a small sticker
/** Random, non-sequential: knowing one seal id says nothing about any other. */
export function newSealId(): string {
  const b = randomBytes(8);
  let s = "";
  for (const x of b) s += SEAL_ALPHABET[x % SEAL_ALPHABET.length];
  return `SC-SEAL-${s}`;
}

export type PhysicalState = "NO_SEALS" | "NOT_VERIFIED" | "INTACT" | "EXCEPTION";

/** Lot-level summary shown on the public page. */
export function summarizePhysical(packages: { sealStatus: SealStatus }[]): { state: PhysicalState; counts: Record<IntegrityStatus, number> } {
  const counts: Record<IntegrityStatus, number> = { NOT_CHECKED: 0, OK: 0, EXCEPTION: 0 };
  for (const p of packages) counts[integrityOf(p.sealStatus)]++;
  const state: PhysicalState = !packages.length ? "NO_SEALS" : counts.EXCEPTION > 0 ? "EXCEPTION" : counts.NOT_CHECKED > 0 ? "NOT_VERIFIED" : "INTACT";
  return { state, counts };
}

/** Free text from the public: strip control characters, collapse whitespace, cap length. Never rendered as HTML. */
export function cleanNote(s: string | undefined, max = 300): string | null {
  const printable = [...(s ?? "")].map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch)).join("");
  const t = printable.replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}
