import { randomBytes } from "node:crypto";

/**
 * QR identity rules.
 *
 * - The public token is 32 bytes (256 bits) from the OS CSPRNG, base64url
 *   encoded (43 chars). It is not derived from any database id, so it cannot
 *   be enumerated or guessed.
 * - The QR image encodes ONLY `<PUBLIC_TRACE_BASE_URL>/trace/<token>`.
 *   No quantity, contact details, status or JSON is ever embedded.
 */

export const PUBLIC_TOKEN_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function generatePublicToken(): string {
  return randomBytes(PUBLIC_TOKEN_BYTES).toString("base64url");
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

export function buildTraceUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/trace/${token}`;
}

/**
 * Extracts the token from a scanned QR payload. Accepts a full trace URL
 * (any host listed in `allowedOrigins`) or a bare token.
 */
export function extractTokenFromPayload(payload: string, allowedOrigins: string[]): string | null {
  const text = payload.trim();
  if (isWellFormedToken(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!allowedOrigins.some((o) => o === url.origin)) return null;
  const m = url.pathname.match(/^\/trace\/([A-Za-z0-9_-]{43})\/?$/);
  return m ? m[1] : null;
}

const STATE_CODES: Record<string, string> = {
  punjab: "PB", haryana: "HR", "uttar pradesh": "UP", "west bengal": "WB", bihar: "BR", gujarat: "GJ",
  "madhya pradesh": "MP", maharashtra: "MH", karnataka: "KA", "himachal pradesh": "HP", rajasthan: "RJ",
  delhi: "DL", assam: "AS", odisha: "OD", "tamil nadu": "TN", kerala: "KL", telangana: "TS",
  "andhra pradesh": "AP", jharkhand: "JH", chhattisgarh: "CG", uttarakhand: "UK", meghalaya: "ML",
  "jammu and kashmir": "JK", nagaland: "NL", sikkim: "SK", tripura: "TR", goa: "GA", manipur: "MN",
  mizoram: "MZ", "arunachal pradesh": "AR",
};

export function stateCode(state: string | null | undefined): string {
  if (!state) return "XX";
  const k = state.trim().toLowerCase();
  if (STATE_CODES[k]) return STATE_CODES[k];
  for (const [name, code] of Object.entries(STATE_CODES)) if (k.includes(name)) return code;
  return "XX";
}

/** LOT-<year>-<state code>-<6-digit global sequence>, e.g. LOT-2026-PB-000001 */
export function formatLotCode(year: number, state: string | null | undefined, seq: number | bigint): string {
  return `LOT-${year}-${stateCode(state)}-${String(seq).padStart(6, "0")}`;
}
