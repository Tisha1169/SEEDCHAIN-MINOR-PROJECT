import type { Admin } from "../en/admin";
const admin: Admin = {
  admin: {
    dash: {
      title: "ਕਮਾਂਡ ਸੈਂਟਰ", subtitle: "ਲਾਈਵ ਡਾਟਾਬੇਸ ਮੁੱਲ · ਬਣਾਇਆ ਗਿਆ {{time}}", pending: "{{n}} ਕਿਸਾਨ ਅਰਜ਼ੀਆਂ ਮਨਜ਼ੂਰੀ ਦੀ ਉਡੀਕ ਵਿੱਚ →",
      farmers: "ਕਿਸਾਨ", verified: "{{n}} ਤਸਦੀਕਸ਼ੁਦਾ", activeLots: "ਸਰਗਰਮ ਲਾਟ", scansToday: "ਅੱਜ ਦੇ QR ਸਕੈਨ", ordersToday: "ਅੱਜ ਦੇ ਆਰਡਰ", completedOverall: "ਕੁੱਲ {{n}} ਪੂਰੇ ਹੋਏ",
      available: "ਉਪਲਬਧ", reserved: "ਰਾਖਵਾਂ", sold: "ਵਿਕਿਆ", lossRate: "ਨੁਕਸਾਨ ਦਰ {{n}}%", customers: "ਗਾਹਕ", traceEvents: "ਟਰੇਸ ਘਟਨਾਵਾਂ", openAlerts: "ਖੁੱਲ੍ਹੇ ਅਲਰਟ",
      highRisk: "ਉੱਚ ਜੋਖਮ ਵਾਲੇ ਲਾਟ", rulesNotAi: "ਪਾਰਦਰਸ਼ੀ ਨਿਯਮ, AI ਨਹੀਂ", pendingFarmers: "ਬਕਾਇਆ ਕਿਸਾਨ",
      orders: "ਆਰਡਰ", scans: "QR ਸਕੈਨ", last14: "ਪਿਛਲੇ 14 ਦਿਨ", invByFarmer: "ਕਿਸਾਨ ਮੁਤਾਬਕ ਇਨਵੈਂਟਰੀ", invByFarmerSub: "ਚੋਟੀ ਦੇ 10 · ਉਪਲਬਧ / ਰਾਖਵਾਂ / ਵਿਕਿਆ", lotsByStatus: "ਸਥਿਤੀ ਮੁਤਾਬਕ ਲਾਟ",
      riskDist: "ਜੋਖਮ ਵੰਡ", riskSub: "ਨਿਯਮ-ਆਧਾਰਿਤ (rules-v1)", potatoPrice: "ਆਲੂ ਦਾ ਮਾਡਲ ਭਾਅ", potatoPriceSub: "ਰੁਪਏ / ਕੁਇੰਟਲ · ਬਾਹਰੀ, data.gov.in", noData: "ਹਾਲੇ ਡਾਟਾ ਨਹੀਂ", dataHealth: "ਡਾਟਾ ਸਿਹਤ: ਹਰ ਬਾਹਰੀ ਸਰੋਤ",
    },
    users: {
      title: "ਵਰਤੋਂਕਾਰ ਅਤੇ ਕਿਸਾਨ", subtitle: "ਲਾਟ ਅਤੇ QR ਕੋਡ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਕਿਸਾਨਾਂ ਨੂੰ ਮਨਜ਼ੂਰੀ ਦਿਓ।", allRoles: "ਸਾਰੀਆਂ ਭੂਮਿਕਾਵਾਂ", farmers: "ਕਿਸਾਨ", customers: "ਗਾਹਕ", admins: "ਐਡਮਿਨ",
      cols: { name: "ਨਾਮ", email: "ਈਮੇਲ", role: "ਭੂਮਿਕਾ", status: "ਸਥਿਤੀ", profile: "ਥਾਂ / ਜਨਤਕ ਪ੍ਰੋਫਾਈਲ", joined: "ਜੁੜੇ" },
      approve: "ਮਨਜ਼ੂਰ ਕਰੋ", reject: "ਇਨਕਾਰ ਕਰੋ", suspend: "ਮੁਅੱਤਲ ਕਰੋ", reactivate: "ਮੁੜ ਚਾਲੂ ਕਰੋ", done: "{{action}} ਹੋ ਗਿਆ", failed: "ਅਸਫਲ",
      dlgTitle: "{{name}}: {{action}}", auditNote: "ਆਡਿਟ ਲਾਗ ਵਿੱਚ ਦਰਜ ਹੁੰਦਾ ਹੈ।", reasonRequired: "ਕਾਰਨ (ਲੋੜੀਂਦਾ)", noteOptional: "ਤਸਦੀਕ ਨੋਟ (ਚੋਣਵਾਂ)", cancel: "ਰੱਦ ਕਰੋ", confirm: "ਪੁਸ਼ਟੀ ਕਰੋ",
    },
    events: {
      title: "ਟਰੇਸ ਘਟਨਾਵਾਂ", subtitle: "ਹਰ ਲਾਟ ਦਾ ਸਿਰਫ਼-ਜੁੜਨ ਵਾਲਾ ਇਤਿਹਾਸ।", filter: "ਕਿਸਮ ਮੁਤਾਬਕ ਫਿਲਟਰ ਕਰੋ, ਜਿਵੇਂ ORDER_CREATED",
      cols: { recorded: "ਦਰਜ", lot: "ਲਾਟ", event: "ਘਟਨਾ", who: "ਕਿਸਨੇ", qty: "ਮਾਤਰਾ Δ", reason: "ਕਾਰਨ", source: "ਸਰੋਤ" },
      latestScans: "ਤਾਜ਼ਾ QR ਸਕੈਨ", scanCols: { time: "ਸਮਾਂ", lot: "ਲਾਟ", qrv: "QR v", result: "ਨਤੀਜਾ", source: "ਸਰੋਤ", device: "ਡਿਵਾਈਸ", signedIn: "ਸਾਈਨ ਇਨ" }, yes: "ਹਾਂ", no: "ਨਹੀਂ", system: "ਸਿਸਟਮ",
    },
    audit: { title: "ਆਡਿਟ ਲਾਗ", subtitle: "ਕਿਸਨੇ ਕੀ ਕੀਤਾ, ਕਿਸ ਰਿਕਾਰਡ ’ਤੇ, ਪਹਿਲਾਂ/ਬਾਅਦ ਦੇ ਮੁੱਲਾਂ ਸਮੇਤ।", cols: { when: "ਕਦੋਂ", who: "ਕਿਸਨੇ", action: "ਕਾਰਵਾਈ", entity: "ਇਕਾਈ", change: "ਬਦਲਾਅ", request: "ਬੇਨਤੀ" }, system: "ਸਿਸਟਮ" },
    sources: {
      title: "ਬਾਹਰੀ ਡਾਟਾ ਸਰੋਤ", subtitle: "ਸਰੋਤ-ਵੰਸ਼ਾਵਲੀ ਸਮੇਤ ਬੈਕਐਂਡ ਰਾਹੀਂ ਡਾਟਾ ਲਿਆਉਣਾ। ਬ੍ਰਾਊਜ਼ਰ ਕਦੇ ਇਨ੍ਹਾਂ API ਨੂੰ ਸਿੱਧਾ ਨਹੀਂ ਬੁਲਾਉਂਦਾ।", runNow: "ਹੁਣੇ ਚਲਾਓ", runFailed: "ਚਲਾਉਣਾ ਅਸਫਲ", recordsToast: "{{status}}: {{n}} ਰਿਕਾਰਡ",
      cols: { started: "ਸ਼ੁਰੂ", status: "ਸਥਿਤੀ", records: "ਰਿਕਾਰਡ", version: "ਸੰਸਕਰਣ", endpoint: "ਐਂਡਪੁਆਇੰਟ (ਗੁਪਤ ਹਟਾਏ ਗਏ)", error: "ਗਲਤੀ" },
    },
  },
  enums: {
    scanResult: { OK: "ਠੀਕ", UNKNOWN: "ਅਣਜਾਣ", REVOKED: "ਰੱਦ", REPLACED: "ਬਦਲਿਆ ਗਿਆ", INVALID: "ਗਲਤ", DISABLED: "ਬੰਦ" },
    scanSource: { camera_link: "ਫ਼ੋਨ ਕੈਮਰਾ ਲਿੰਕ", in_app_scanner: "ਐਪ ਸਕੈਨਰ", manual_entry: "ਹੱਥੀਂ ਦਰਜ" },
    device: { mobile: "ਮੋਬਾਈਲ", desktop: "ਡੈਸਕਟਾਪ" },
    runStatus: { SUCCESS: "ਸਫਲ", FAILED: "ਅਸਫਲ", PARTIAL: "ਅੰਸ਼ਕ", SKIPPED: "ਛੱਡਿਆ ਗਿਆ" },
    userAction: { approve: "ਮਨਜ਼ੂਰ ਕਰੋ", reject: "ਇਨਕਾਰ ਕਰੋ", suspend: "ਮੁਅੱਤਲ ਕਰੋ", reactivate: "ਮੁੜ ਚਾਲੂ ਕਰੋ" },
  },
};
export default admin;
