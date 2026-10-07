import i18n from "@/i18n";

/**
 * The API authors a small, fixed set of English sentences (event reasons, risk factors, alert messages,
 * weather conditions, data-source descriptions). They are translated here by exact match or by pattern;
 * anything not recognised (for example text a farmer or admin typed) is shown exactly as stored.
 */
const EXACT: Record<string, string> = {
  "Customer order placed; stock reserved": "reasonOrderPlaced",
  "Farmer registered a new lot": "reasonLotRegistered",
  "Farmer updated lot details": "reasonLotUpdated",
  "Farmer-managed storage": "reasonStorage",
  "First verified scan of this QR": "reasonFirstScan",
  "Harvest": "reasonHarvest",
  "No remaining available or reserved stock": "reasonNoStock",
  "Farmer listed produce for customers": "reasonListed",
  "Farmer paused listing": "reasonPaused",
  "Quality grading at harvest": "reasonQualityAtHarvest",
  "No harvested stock yet": "riskNoHarvest",
  "No remaining available stock": "riskNoStock",
  "No risk factors detected by the configured rules": "riskNone",
  "Farmer reported poor storage condition": "riskStoragePoor",
  "Farmer reported fair storage condition": "riskStorageFair",
  "Quality grade C": "riskGradeC",
  "Quality grade B": "riskGradeB",
  "No quality grade recorded": "riskNoGrade",
  "A scanned code was not a SeedChain trace QR": "alertNotSeedchain",
  "A well-formed but unknown SeedChain token was scanned (possible counterfeit label)": "alertUnknownToken",
  "Clear sky": "wxClear", "Partly cloudy": "wxPartly", "Fog": "wxFog", "Drizzle": "wxDrizzle", "Rain": "wxRain", "Snow": "wxSnow", "Rain showers": "wxShowers", "Snow showers": "wxSnowShowers", "Thunderstorm": "wxThunder",
};

const PATTERNS: Array<[RegExp, string, (m: RegExpMatchArray) => Record<string, unknown>]> = [
  [/^Storage duration (\d+) days exceeds (\d+)-day threshold for (.+)$/, "riskStorageHigh", (m) => ({ days: m[1], limit: m[2], type: kind(m[3]) })],
  [/^Storage duration (\d+) days exceeds (\d+)-day advisory threshold for (.+)$/, "riskStorageWarn", (m) => ({ days: m[1], limit: m[2], type: kind(m[3]) })],
  [/^Recorded cold-storage temperature (-?[\d.]+)°C is above (-?[\d.]+)°C$/, "riskColdTemp", (m) => ({ t: m[1], limit: m[2] })],
  [/^Recorded storage temperature (-?[\d.]+)°C is above (-?[\d.]+)°C$/, "riskTemp", (m) => ({ t: m[1], limit: m[2] })],
  [/^Recorded storage humidity ([\d.]+)% is above ([\d.]+)% \(rot risk\)$/, "riskHumHigh", (m) => ({ h: m[1], limit: m[2] })],
  [/^Recorded storage humidity ([\d.]+)% is below ([\d.]+)% \(shrinkage risk\)$/, "riskHumLow", (m) => ({ h: m[1], limit: m[2] })],
  [/^Harvested (\d+) days ago with no storage information recorded$/, "riskNoStorageInfo", (m) => ({ days: m[1] })],
  [/^Last quality inspection (\d+) days ago \(overdue after (\d+)\)$/, "riskInspection", (m) => ({ days: m[1], limit: m[2] })],
  [/^Recorded loss ([\d.]+)% of harvest \(≥ ([\d.]+)%\)$/, "riskLoss", (m) => ({ rate: m[1], limit: m[2] })],
  [/^(\d+) spoilage report\(s\) in the last 30 days$/, "riskSpoilage", (m) => ({ n: m[1] })],
  [/^Potential QR anomaly: (.+)$/, "reasonAnomaly", (m) => ({ kind: m[1] })],
  [/^A (\w+) QR \(v(\d+)\) of (\S+) was scanned$/, "alertScanned", (m) => ({ result: i18n.t(`enums.scanResult.${m[1].toUpperCase()}`, { defaultValue: m[1] }), v: m[2], code: m[3] })],
  [/^Order (\S+) has been (\w+) since (\S+)$/, "alertOrderStuck", (m) => ({ code: m[1], status: i18n.t(`enums.orderStatus.${m[2]}`, { defaultValue: m[2] }), date: m[3] })],
  [/^(\S+): potential QR anomaly \((.+)\)\. A human should investigate before any action\.$/, "alertAnomaly", (m) => ({ code: m[1], kind: m[2] })],
  [/^QR v(\d+) of (\S+) was revoked by an admin: (.*)$/, "alertQrRevoked", (m) => ({ v: m[1], code: m[2], reason: m[3] })],
  [/^(\S+) recalled: (.*)$/, "alertRecalled", (m) => ({ code: m[1], reason: m[2] })],
];

function kind(s: string): string {
  return i18n.t(`enums.storageKind.${s}`, { defaultValue: s.replace(/_/g, " ") });
}

export function serverText(s: string | null | undefined): string {
  if (!s) return "";
  const ex = EXACT[s];
  if (ex) return i18n.t(`srv.${ex}`, { defaultValue: s });
  for (const [re, key, params] of PATTERNS) {
    const m = s.match(re);
    if (m) return i18n.t(`srv.${key}`, { ...params(m), defaultValue: s });
  }
  // risk-alert messages join several factors with "; "
  const spoil = s.match(/^(\S+): (\w+) spoilage risk\. (.*)$/);
  if (spoil) return i18n.t("srv.alertSpoilage", { code: spoil[1], level: i18n.t(`enums.risk.${spoil[2]}`, { defaultValue: spoil[2] }), reasons: spoil[3].split("; ").map(serverText).join("; "), defaultValue: s });
  return s;
}

/** Data-source name/frequency/note by registry id, falling back to the text the server sent. */
export const sourceLabel = (id: string, fb: string) => i18n.t(`srv.sources.${id}.label`, { defaultValue: fb });
export const sourceFrequency = (id: string, fb: string) => i18n.t(`srv.sources.${id}.frequency`, { defaultValue: fb });
export const sourceNote = (id: string, fb: string | null | undefined) => (fb ? i18n.t(`srv.sources.${id}.note`, { defaultValue: fb }) : "");
