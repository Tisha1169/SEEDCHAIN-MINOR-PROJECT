import type { Server } from "../en/server";
const server: Server = {
  srv: {
    reasonOrderPlaced: "ਗਾਹਕ ਨੇ ਆਰਡਰ ਦਿੱਤਾ; ਸਟਾਕ ਰਾਖਵਾਂ", reasonLotRegistered: "ਕਿਸਾਨ ਨੇ ਨਵਾਂ ਲਾਟ ਦਰਜ ਕੀਤਾ", reasonLotUpdated: "ਕਿਸਾਨ ਨੇ ਲਾਟ ਦਾ ਵੇਰਵਾ ਅੱਪਡੇਟ ਕੀਤਾ", reasonStorage: "ਕਿਸਾਨ-ਪ੍ਰਬੰਧਿਤ ਭੰਡਾਰਨ",
    reasonFirstScan: "ਇਸ QR ਦਾ ਪਹਿਲਾ ਤਸਦੀਕਸ਼ੁਦਾ ਸਕੈਨ", reasonHarvest: "ਵਾਢੀ", reasonNoStock: "ਕੋਈ ਉਪਲਬਧ ਜਾਂ ਰਾਖਵਾਂ ਸਟਾਕ ਬਾਕੀ ਨਹੀਂ", reasonListed: "ਕਿਸਾਨ ਨੇ ਉਪਜ ਗਾਹਕਾਂ ਲਈ ਸੂਚੀਬੱਧ ਕੀਤੀ", reasonPaused: "ਕਿਸਾਨ ਨੇ ਸੂਚੀ ਰੋਕੀ",
    reasonQualityAtHarvest: "ਵਾਢੀ ਵੇਲੇ ਗੁਣਵੱਤਾ ਗ੍ਰੇਡਿੰਗ", reasonAnomaly: "ਸੰਭਾਵੀ QR ਬੇਨਿਯਮੀ: {{kind}}",
    riskNoHarvest: "ਹਾਲੇ ਕੋਈ ਵੱਢਿਆ ਸਟਾਕ ਨਹੀਂ", riskNoStock: "ਕੋਈ ਉਪਲਬਧ ਸਟਾਕ ਬਾਕੀ ਨਹੀਂ", riskNone: "ਤੈਅ ਨਿਯਮਾਂ ਤੋਂ ਕੋਈ ਜੋਖਮ ਕਾਰਕ ਨਹੀਂ ਮਿਲਿਆ", riskStoragePoor: "ਕਿਸਾਨ ਨੇ ਭੰਡਾਰਨ ਦੀ ਹਾਲਤ ਮਾੜੀ ਦੱਸੀ",
    riskStorageFair: "ਕਿਸਾਨ ਨੇ ਭੰਡਾਰਨ ਦੀ ਹਾਲਤ ਠੀਕ-ਠਾਕ ਦੱਸੀ", riskGradeC: "ਗੁਣਵੱਤਾ ਗ੍ਰੇਡ C", riskGradeB: "ਗੁਣਵੱਤਾ ਗ੍ਰੇਡ B", riskNoGrade: "ਗੁਣਵੱਤਾ ਗ੍ਰੇਡ ਦਰਜ ਨਹੀਂ",
    riskStorageHigh: "{{type}} ਵਿੱਚ ਭੰਡਾਰਨ ਮਿਆਦ {{days}} ਦਿਨ, {{limit}}-ਦਿਨ ਦੀ ਹੱਦ ਤੋਂ ਵੱਧ", riskStorageWarn: "{{type}} ਵਿੱਚ ਭੰਡਾਰਨ ਮਿਆਦ {{days}} ਦਿਨ, {{limit}}-ਦਿਨ ਦੀ ਸਲਾਹ-ਹੱਦ ਤੋਂ ਵੱਧ",
    riskColdTemp: "ਦਰਜ ਕੋਲਡ-ਸਟੋਰੇਜ ਤਾਪਮਾਨ {{t}}°C, {{limit}}°C ਤੋਂ ਵੱਧ ਹੈ", riskTemp: "ਦਰਜ ਭੰਡਾਰਨ ਤਾਪਮਾਨ {{t}}°C, {{limit}}°C ਤੋਂ ਵੱਧ ਹੈ",
    riskHumHigh: "ਦਰਜ ਭੰਡਾਰਨ ਨਮੀ {{h}}%, {{limit}}% ਤੋਂ ਵੱਧ ਹੈ (ਸੜਨ ਦਾ ਜੋਖਮ)", riskHumLow: "ਦਰਜ ਭੰਡਾਰਨ ਨਮੀ {{h}}%, {{limit}}% ਤੋਂ ਘੱਟ ਹੈ (ਸੁੰਗੜਨ ਦਾ ਜੋਖਮ)",
    riskNoStorageInfo: "{{days}} ਦਿਨ ਪਹਿਲਾਂ ਵਾਢੀ ਹੋਈ, ਭੰਡਾਰਨ ਦੀ ਕੋਈ ਜਾਣਕਾਰੀ ਦਰਜ ਨਹੀਂ", riskInspection: "ਆਖ਼ਰੀ ਗੁਣਵੱਤਾ ਜਾਂਚ {{days}} ਦਿਨ ਪਹਿਲਾਂ ਹੋਈ ({{limit}} ਦਿਨ ਤੋਂ ਬਾਅਦ ਦੇਰੀ)",
    riskLoss: "ਦਰਜ ਨੁਕਸਾਨ ਵਾਢੀ ਦਾ {{rate}}% (≥ {{limit}}%)", riskSpoilage: "ਪਿਛਲੇ 30 ਦਿਨਾਂ ਵਿੱਚ {{n}} ਖਰਾਬੀ ਰਿਪੋਰਟਾਂ",
    alertNotSeedchain: "ਸਕੈਨ ਕੀਤਾ ਕੋਡ SeedChain ਟਰੇਸ QR ਨਹੀਂ ਸੀ", alertUnknownToken: "ਸਹੀ ਬਣਤਰ ਦਾ ਪਰ ਅਣਜਾਣ SeedChain ਟੋਕਨ ਸਕੈਨ ਹੋਇਆ (ਸੰਭਾਵੀ ਨਕਲੀ ਲੇਬਲ)",
    alertScanned: "{{code}} ਦਾ {{result}} QR (v{{v}}) ਸਕੈਨ ਹੋਇਆ", alertOrderStuck: "ਆਰਡਰ {{code}} {{date}} ਤੋਂ {{status}} ਸਥਿਤੀ ਵਿੱਚ ਹੈ",
    alertAnomaly: "{{code}}: ਸੰਭਾਵੀ QR ਬੇਨਿਯਮੀ ({{kind}})। ਕੋਈ ਵੀ ਕਾਰਵਾਈ ਤੋਂ ਪਹਿਲਾਂ ਕਿਸੇ ਵਿਅਕਤੀ ਨੂੰ ਜਾਂਚ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ।", alertQrRevoked: "{{code}} ਦਾ QR v{{v}} ਐਡਮਿਨ ਨੇ ਰੱਦ ਕੀਤਾ: {{reason}}",
    alertRecalled: "{{code}} ਵਾਪਸ ਮੰਗਵਾਇਆ ਗਿਆ: {{reason}}", alertSpoilage: "{{code}}: {{level}} ਖਰਾਬੀ ਜੋਖਮ। {{reasons}}",
    wxClear: "ਸਾਫ਼ ਅਸਮਾਨ", wxPartly: "ਅੰਸ਼ਕ ਬੱਦਲ", wxFog: "ਧੁੰਦ", wxDrizzle: "ਹਲਕੀ ਬੂੰਦਾਬਾਂਦੀ", wxRain: "ਮੀਂਹ", wxSnow: "ਬਰਫ਼ਬਾਰੀ", wxShowers: "ਮੀਂਹ ਦੀਆਂ ਬੌਛਾੜਾਂ", wxSnowShowers: "ਬਰਫ਼ ਦੀਆਂ ਬੌਛਾੜਾਂ", wxThunder: "ਗਰਜ ਨਾਲ ਤੂਫ਼ਾਨ",
    sources: {
      agmarknet_portal: { label: "ਐਗਮਾਰਕਨੈੱਟ (ਖੇਤੀ ਮੰਡੀਕਰਨ ਸੂਚਨਾ ਨੈੱਟਵਰਕ)", frequency: "ਰੋਜ਼ਾਨਾ", note: "ਪਹੁੰਚ ਵਿੱਚ ਹੈ (ਸਿਰਫ਼ ਜਾਵਾਸਕ੍ਰਿਪਟ ਢਾਂਚਾ)। ਜੁੜਿਆ ਨਹੀਂ ਹੈ।" },
      datagov_mandi_daily: { label: "ਵੱਖ-ਵੱਖ ਮੰਡੀਆਂ ਵਿੱਚ ਵੱਖ-ਵੱਖ ਵਸਤਾਂ ਦੇ ਤਾਜ਼ਾ ਰੋਜ਼ਾਨਾ ਭਾਅ", frequency: "ਰੋਜ਼ਾਨਾ (ਉਪਲਬਧ ਨਵੀਨਤਮ ਨਿਰੀਖਣ ਮਿਤੀ, ਰੀਅਲ-ਟਾਈਮ ਨਹੀਂ)", note: "ਲਾਈਵ ਤਸਦੀਕ ਨਹੀਂ: data.gov.in API ਕੁੰਜੀ ਅਤੇ ਹੋਸਟ ਤੱਕ ਪਹੁੰਚਣ ਵਾਲਾ ਨੈੱਟਵਰਕ ਚਾਹੀਦਾ ਹੈ। ਫ਼ਾਈਲ-ਇੰਪੋਰਟ ਬਦਲ ਵਿੱਚ ਉਹੀ ਜਾਂਚ ਹੁੰਦੀ ਹੈ।" },
      des_agri: { label: "ਅਰਥ ਅਤੇ ਅੰਕੜਾ ਡਾਇਰੈਕਟੋਰੇਟ: ਖੇਤੀ ਅੰਕੜੇ", frequency: "ਸਾਲਾਨਾ", note: "ਜੁੜਿਆ ਨਹੀਂ ਹੈ।" },
      faostat_potato_india: { label: "FAOSTAT: ਫ਼ਸਲਾਂ ਅਤੇ ਪਸ਼ੂ ਧਨ ਉਤਪਾਦ (QCL), ਆਲੂ, ਭਾਰਤ", frequency: "ਸਾਲਾਨਾ; ਮਾਸਿਕ ਜਾਂਚ", note: "ਲਾਈਵ ਤਸਦੀਕ: ਬਲਕ ਫ਼ਾਈਲ ਉਪਲਬਧ; ਭਾਰਤ ਦੇ ਆਲੂ ਦੇ ਅੰਕੜੇ 1961 ਤੋਂ 2024 ਤੱਕ ਮਿਲੇ।" },
      icar_cpri_jalandhar: { label: "ਆਈਸੀਏਆਰ-ਕੇਂਦਰੀ ਆਲੂ ਖੋਜ ਸੰਸਥਾ, ਖੇਤਰੀ ਕੇਂਦਰ ਜਲੰਧਰ", frequency: "ਲਾਗੂ ਨਹੀਂ", note: "ਪ੍ਰਾਪਤ ਨਹੀਂ ਹੋ ਸਕਿਆ: ICAR ਸਾਈਟ ਦਾ TLS ਸਰਟੀਫਿਕੇਟ ਮਿਆਦ ਪੁੱਗਾ ਹੈ ਅਤੇ ਸਰਟੀਫਿਕੇਟ ਜਾਂਚ ਬੰਦ ਨਹੀਂ ਕੀਤੀ ਗਈ।" },
      imd_mausam: { label: "ਭਾਰਤ ਮੌਸਮ ਵਿਭਾਗ (IMD): ਮੌਸਮ ਅਤੇ ਵਰਖਾ", frequency: "ਰੋਜ਼ਾਨਾ ਅਤੇ ਦਿਨ ਵਿੱਚ ਕਈ ਵਾਰ", note: "ਪਹੁੰਚ ਵਿੱਚ ਹੈ। ਜੁੜਿਆ ਨਹੀਂ ਹੈ।" },
      nhb_statistics: { label: "ਕੌਮੀ ਬਾਗਬਾਨੀ ਬੋਰਡ: ਬਾਗਬਾਨੀ ਅੰਕੜੇ", frequency: "ਸਾਲਾਨਾ", note: "ਪਹੁੰਚ ਵਿੱਚ ਹੈ। ਜੁੜਿਆ ਨਹੀਂ ਹੈ।" },
      open_meteo_current: { label: "Open-Meteo ਪੂਰਵ-ਅਨੁਮਾਨ API: ਮੌਜੂਦਾ ਹਾਲਾਤ", frequency: "ਮਾਡਲ ਆਊਟਪੁੱਟ ਲਗਭਗ ਹਰ 15 ਮਿੰਟ ਅੱਪਡੇਟ; ਹਰ ਘੰਟੇ ਲਿਆਂਦਾ ਜਾਂਦਾ ਹੈ", note: "ਲਾਈਵ ਤਸਦੀਕ।" },
      pau_potato_punjab: { label: "ਪੰਜਾਬ ਵਿੱਚ ਆਲੂ ਦੀ ਖੇਤੀ (ਜ਼ਿਲ੍ਹਾ-ਵਾਰ ਰਕਬਾ, ਉਤਪਾਦਨ, ਝਾੜ)", frequency: "ਸਾਲਾਨਾ (ਜਦੋਂ ਵੀ PAU ਪੰਨਾ ਅੱਪਡੇਟ ਕਰੇ); ਹਫ਼ਤਾਵਾਰੀ ਜਾਂਚ", note: "ਲਾਈਵ ਤਸਦੀਕ: HTML ਸਾਰਣੀ ਪੜ੍ਹੀ ਅਤੇ ਜਾਂਚੀ ਗਈ (ਝਾੜ = ਉਤਪਾਦਨ / ਰਕਬਾ)।" },
    },
  },
};
export default server;
