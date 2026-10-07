import type { App } from "../en/app";
const app: App = {
  common: {
    loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…", unavailable: "ਸੇਵਾ ਉਪਲਬਧ ਨਹੀਂ", tryAgain: "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ", riskLevel: "{{level}} ਜੋਖਮ",
    save: "ਸੰਭਾਲੋ", cancel: "ਰੱਦ ਕਰੋ", close: "ਬੰਦ ਕਰੋ", back: "ਪਿੱਛੇ", next: "ਅੱਗੇ", submit: "ਜਮ੍ਹਾਂ ਕਰੋ", confirm: "ਪੁਸ਼ਟੀ ਕਰੋ", edit: "ਸੋਧੋ", delete: "ਮਿਟਾਓ",
    search: "ਖੋਜੋ", filter: "ਫਿਲਟਰ", refresh: "ਰਿਫ੍ਰੈਸ਼", view: "ਵੇਖੋ", details: "ਵੇਰਵਾ", all: "ਸਾਰੇ", none: "ਕੋਈ ਨਹੀਂ", yes: "ਹਾਂ", no: "ਨਹੀਂ",
    optional: "ਚੋਣਵਾਂ", required: "ਲੋੜੀਂਦਾ", actions: "ਕਾਰਵਾਈਆਂ", status: "ਸਥਿਤੀ", date: "ਤਾਰੀਖ", name: "ਨਾਮ", email: "ਈਮੇਲ", phone: "ਫ਼ੋਨ",
    quantity: "ਮਾਤਰਾ", price: "ਕੀਮਤ", total: "ਕੁੱਲ", notes: "ਨੋਟ", reason: "ਕਾਰਨ", saving: "ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…", sending: "ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
  },
  layout: {
    nav: {
      dashboard: "ਡੈਸ਼ਬੋਰਡ", farms: "ਖੇਤ ਅਤੇ ਉਤਪਾਦ", lots: "ਮੇਰੇ ਲਾਟ", inventory: "ਇਨਵੈਂਟਰੀ", orders: "ਆਰਡਰ", market: "ਮੰਡੀ ਅਤੇ ਮੌਸਮ", alerts: "ਅਲਰਟ",
      scan: "QR ਸਕੈਨ ਕਰੋ", account: "ਖਾਤਾ", browse: "ਉਪਜ ਵੇਖੋ", myOrders: "ਮੇਰੇ ਆਰਡਰ", command: "ਕਮਾਂਡ ਸੈਂਟਰ", users: "ਵਰਤੋਂਕਾਰ ਅਤੇ ਕਿਸਾਨ",
      adminLots: "ਲਾਟ ਅਤੇ QR ਕੋਡ", events: "ਟਰੇਸ ਘਟਨਾਵਾਂ", sources: "ਡਾਟਾ ਸਰੋਤ", audit: "ਆਡਿਟ ਲਾਗ",
    },
    newLot: "ਨਵਾਂ ਲਾਟ", openMenu: "ਮੀਨੂ ਖੋਲ੍ਹੋ", closeMenu: "ਮੀਨੂ ਬੰਦ ਕਰੋ", workspaceNav: "ਕਾਰਜ-ਖੇਤਰ ਨੈਵੀਗੇਸ਼ਨ", signOut: "ਸਾਈਨ ਆਊਟ",
    pendingTitle: "ਐਡਮਿਨ ਦੀ ਮਨਜ਼ੂਰੀ ਦੀ ਉਡੀਕ ਹੈ।",
    pendingBody: "ਤੁਸੀਂ ਹੁਣ ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰ ਸਕਦੇ ਹੋ; ਐਡਮਿਨ ਵੱਲੋਂ ਤੁਹਾਡਾ ਖਾਤਾ ਤਸਦੀਕ ਹੋਣ ’ਤੇ ਖੇਤ, ਲਾਟ ਅਤੇ QR ਕੋਡ ਬਣਾਉਣਾ ਖੁੱਲ੍ਹ ਜਾਵੇਗਾ।",
    live: "ਲਾਈਵ ਅੱਪਡੇਟ ਜੁੜੇ ਹਨ", polling: "ਹਰ 20 ਸਕਿੰਟ ਬਾਅਦ ਰਿਫ੍ਰੈਸ਼", offline: "ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਹੋ",
    liveHint: "ਅੱਪਡੇਟ ਸਰਵਰ-ਸੈਂਟ ਇਵੈਂਟ ਸਟ੍ਰੀਮ ਰਾਹੀਂ ਆਉਂਦੇ ਹਨ; ਉਪਲਬਧ ਨਾ ਹੋਣ ’ਤੇ ਐਪ ਹਰ 20 ਸਕਿੰਟ ਬਾਅਦ ਜਾਂਚਦੀ ਹੈ",
    sync: {
      pending: "ਆਫ਼ਲਾਈਨ ਸੰਭਾਲਿਆ: {{n}} ਕਾਰਵਾਈਆਂ ਸਿੰਕ ਹੋਣ ਦੀ ਉਡੀਕ ਵਿੱਚ ਹਨ।",
      conflict: "ਸਿੰਕ ਟਕਰਾਅ: {{n}} ਕਾਰਵਾਈਆਂ ਸਰਵਰ ਨੇ ਰੱਦ ਕੀਤੀਆਂ ਅਤੇ ਤੁਹਾਡੀ ਸਮੀਖਿਆ ਚਾਹੀਦੀ ਹੈ।",
      syncNow: "ਹੁਣੇ ਸਿੰਕ ਕਰੋ", done: "{{n}} ਕਾਰਵਾਈਆਂ ਸਿੰਕ ਹੋਈਆਂ", still: "ਹਾਲੇ ਵੀ ਆਫ਼ਲਾਈਨ ਹੈ ਜਾਂ ਸਿੰਕ ਕਰਨ ਲਈ ਕੁਝ ਨਹੀਂ",
      rejected: "ਰੱਦ: {{error}}", nothingOverwritten: "ਕੁਝ ਵੀ ਓਵਰਰਾਈਟ ਨਹੀਂ ਹੋਇਆ। ਰਿਕਾਰਡ ਵੇਖੋ ਅਤੇ ਜੇ ਜਾਇਜ਼ ਹੈ ਤਾਂ ਕਾਰਵਾਈ ਦੁਬਾਰਾ ਦਰਜ ਕਰੋ।", dismiss: "ਹਟਾਓ",
    },
  },
  authShell: { brand: "SeedChain", line1: "ਹਰ ਫ਼ਸਲ ਦੀ", line2: "ਇੱਕ ਕਹਾਣੀ ਹੈ।" },
};
export default app;
