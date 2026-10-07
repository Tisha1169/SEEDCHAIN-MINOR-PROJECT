const server = {
  srv: {
    reasonOrderPlaced: "Customer order placed; stock reserved", reasonLotRegistered: "Farmer registered a new lot", reasonLotUpdated: "Farmer updated lot details", reasonStorage: "Farmer-managed storage",
    reasonFirstScan: "First verified scan of this QR", reasonHarvest: "Harvest", reasonNoStock: "No remaining available or reserved stock", reasonListed: "Farmer listed produce for customers", reasonPaused: "Farmer paused listing",
    reasonQualityAtHarvest: "Quality grading at harvest", reasonAnomaly: "Potential QR anomaly: {{kind}}",
    riskNoHarvest: "No harvested stock yet", riskNoStock: "No remaining available stock", riskNone: "No risk factors detected by the configured rules", riskStoragePoor: "Farmer reported poor storage condition",
    riskStorageFair: "Farmer reported fair storage condition", riskGradeC: "Quality grade C", riskGradeB: "Quality grade B", riskNoGrade: "No quality grade recorded",
    riskStorageHigh: "Storage duration {{days}} days exceeds {{limit}}-day threshold for {{type}}", riskStorageWarn: "Storage duration {{days}} days exceeds {{limit}}-day advisory threshold for {{type}}",
    riskColdTemp: "Recorded cold-storage temperature {{t}}°C is above {{limit}}°C", riskTemp: "Recorded storage temperature {{t}}°C is above {{limit}}°C",
    riskHumHigh: "Recorded storage humidity {{h}}% is above {{limit}}% (rot risk)", riskHumLow: "Recorded storage humidity {{h}}% is below {{limit}}% (shrinkage risk)",
    riskNoStorageInfo: "Harvested {{days}} days ago with no storage information recorded", riskInspection: "Last quality inspection {{days}} days ago (overdue after {{limit}})",
    riskLoss: "Recorded loss {{rate}}% of harvest (≥ {{limit}}%)", riskSpoilage: "{{n}} spoilage report(s) in the last 30 days",
    alertNotSeedchain: "A scanned code was not a SeedChain trace QR", alertUnknownToken: "A well-formed but unknown SeedChain token was scanned (possible counterfeit label)",
    alertScanned: "A {{result}} QR (v{{v}}) of {{code}} was scanned", alertOrderStuck: "Order {{code}} has been {{status}} since {{date}}",
    alertAnomaly: "{{code}}: potential QR anomaly ({{kind}}). A human should investigate before any action.", alertQrRevoked: "QR v{{v}} of {{code}} was revoked by an admin: {{reason}}",
    alertRecalled: "{{code}} recalled: {{reason}}", alertSpoilage: "{{code}}: {{level}} spoilage risk. {{reasons}}",
    wxClear: "Clear sky", wxPartly: "Partly cloudy", wxFog: "Fog", wxDrizzle: "Drizzle", wxRain: "Rain", wxSnow: "Snow", wxShowers: "Rain showers", wxSnowShowers: "Snow showers", wxThunder: "Thunderstorm",
    sources: {
      agmarknet_portal: { label: "AGMARKNET (Agricultural Marketing Information Network)", frequency: "Daily", note: "Reachable (HTTP 200, 1 kB JavaScript shell). Not integrated." },
      datagov_mandi_daily: { label: "Current daily price of various commodities from various markets (mandis)", frequency: "Daily (latest available observation date, not real-time)", note: "Not verified live: needs a data.gov.in API key and a network that can reach the host. A file-import fallback uses the same validation." },
      des_agri: { label: "Directorate of Economics & Statistics: agricultural statistics", frequency: "Annual", note: "Not integrated." },
      faostat_potato_india: { label: "FAOSTAT: Crops and livestock products (QCL), potatoes, India", frequency: "Annual; checked monthly", note: "Verified live: bulk file reachable; India potato rows found for 1961 to 2024." },
      icar_cpri_jalandhar: { label: "ICAR-Central Potato Research Institute, Regional Station Jalandhar", frequency: "n/a", note: "Not retrievable: the ICAR site serves an expired TLS certificate and certificate verification is not disabled." },
      imd_mausam: { label: "India Meteorological Department (IMD) weather and rainfall", frequency: "Daily and sub-daily", note: "Reachable. Not integrated." },
      nhb_statistics: { label: "National Horticulture Board: horticulture statistics", frequency: "Annual", note: "Reachable. Not integrated." },
      open_meteo_current: { label: "Open-Meteo forecast API: current conditions", frequency: "Model output updated about every 15 minutes; fetched hourly", note: "Verified live." },
      pau_potato_punjab: { label: "Potato cultivation in Punjab (district area, production, yield)", frequency: "Annual (whenever PAU updates the page); checked weekly", note: "Verified live: HTML table parsed and cross-checked (yield = production / area)." },
    },
  },
};
export default server;
export type Server = typeof server;
