import type { Server } from "../en/server";
const server: Server = {
  srv: {
    reasonOrderPlaced: "ग्राहक ने ऑर्डर दिया; स्टॉक आरक्षित", reasonLotRegistered: "किसान ने नया लॉट दर्ज किया", reasonLotUpdated: "किसान ने लॉट का विवरण अपडेट किया", reasonStorage: "किसान-प्रबंधित भंडारण",
    reasonFirstScan: "इस QR का पहला सत्यापित स्कैन", reasonHarvest: "कटाई", reasonNoStock: "कोई उपलब्ध या आरक्षित स्टॉक शेष नहीं", reasonListed: "किसान ने उपज ग्राहकों के लिए सूचीबद्ध की", reasonPaused: "किसान ने सूची रोकी",
    reasonQualityAtHarvest: "कटाई के समय गुणवत्ता ग्रेडिंग", reasonAnomaly: "संभावित QR विसंगति: {{kind}}",
    riskNoHarvest: "अभी कोई कटा हुआ स्टॉक नहीं", riskNoStock: "कोई उपलब्ध स्टॉक शेष नहीं", riskNone: "तय नियमों से कोई जोखिम कारक नहीं मिला", riskStoragePoor: "किसान ने भंडारण की स्थिति खराब बताई",
    riskStorageFair: "किसान ने भंडारण की स्थिति ठीक-ठाक बताई", riskGradeC: "गुणवत्ता ग्रेड C", riskGradeB: "गुणवत्ता ग्रेड B", riskNoGrade: "गुणवत्ता ग्रेड दर्ज नहीं",
    riskStorageHigh: "{{type}} में भंडारण अवधि {{days}} दिन, {{limit}}-दिन की सीमा से अधिक", riskStorageWarn: "{{type}} में भंडारण अवधि {{days}} दिन, {{limit}}-दिन की सलाह-सीमा से अधिक",
    riskColdTemp: "दर्ज कोल्ड-स्टोरेज तापमान {{t}}°C, {{limit}}°C से अधिक है", riskTemp: "दर्ज भंडारण तापमान {{t}}°C, {{limit}}°C से अधिक है",
    riskHumHigh: "दर्ज भंडारण नमी {{h}}%, {{limit}}% से अधिक है (सड़ने का जोखिम)", riskHumLow: "दर्ज भंडारण नमी {{h}}%, {{limit}}% से कम है (सिकुड़ने का जोखिम)",
    riskNoStorageInfo: "{{days}} दिन पहले कटाई हुई, भंडारण की कोई जानकारी दर्ज नहीं", riskInspection: "अंतिम गुणवत्ता जाँच {{days}} दिन पहले हुई ({{limit}} दिन के बाद देरी)",
    riskLoss: "दर्ज नुकसान कटाई का {{rate}}% (≥ {{limit}}%)", riskSpoilage: "पिछले 30 दिनों में {{n}} खराबी रिपोर्ट",
    alertNotSeedchain: "स्कैन किया गया कोड SeedChain ट्रेस QR नहीं था", alertUnknownToken: "सही बनावट का पर अज्ञात SeedChain टोकन स्कैन हुआ (संभावित नकली लेबल)",
    alertScanned: "{{code}} का {{result}} QR (v{{v}}) स्कैन हुआ", alertOrderStuck: "ऑर्डर {{code}} {{date}} से {{status}} स्थिति में है",
    alertAnomaly: "{{code}}: संभावित QR विसंगति ({{kind}})। कोई भी कार्रवाई से पहले किसी व्यक्ति को जाँच करनी चाहिए।", alertQrRevoked: "{{code}} का QR v{{v}} एडमिन ने रद्द किया: {{reason}}",
    alertRecalled: "{{code}} वापस बुलाया गया: {{reason}}", alertSpoilage: "{{code}}: {{level}} खराबी जोखिम। {{reasons}}",
    wxClear: "साफ़ आसमान", wxPartly: "आंशिक बादल", wxFog: "कोहरा", wxDrizzle: "बूँदाबाँदी", wxRain: "बारिश", wxSnow: "बर्फ़बारी", wxShowers: "बौछारें", wxSnowShowers: "बर्फ़ की बौछारें", wxThunder: "आँधी-तूफ़ान",
    sources: {
      agmarknet_portal: { label: "एगमार्कनेट (कृषि विपणन सूचना नेटवर्क)", frequency: "दैनिक", note: "पहुँच में है (केवल जावास्क्रिप्ट ढाँचा)। जुड़ा नहीं है।" },
      datagov_mandi_daily: { label: "विभिन्न मंडियों में विभिन्न वस्तुओं के ताज़ा दैनिक भाव", frequency: "दैनिक (उपलब्ध नवीनतम प्रेक्षण तिथि, रीयल-टाइम नहीं)", note: "लाइव सत्यापित नहीं: data.gov.in API कुंजी और होस्ट तक पहुँचने वाला नेटवर्क चाहिए। फ़ाइल-आयात विकल्प में वही जाँच होती है।" },
      des_agri: { label: "अर्थ एवं सांख्यिकी निदेशालय: कृषि सांख्यिकी", frequency: "वार्षिक", note: "जुड़ा नहीं है।" },
      faostat_potato_india: { label: "FAOSTAT: फ़सलें और पशुधन उत्पाद (QCL), आलू, भारत", frequency: "वार्षिक; मासिक जाँच", note: "लाइव सत्यापित: बल्क फ़ाइल उपलब्ध; भारत के आलू के आँकड़े 1961 से 2024 तक मिले।" },
      icar_cpri_jalandhar: { label: "आईसीएआर-केंद्रीय आलू अनुसंधान संस्थान, क्षेत्रीय केंद्र जालंधर", frequency: "लागू नहीं", note: "प्राप्त नहीं हो सका: ICAR साइट का TLS प्रमाणपत्र समाप्त है और प्रमाणपत्र जाँच बंद नहीं की गई है।" },
      imd_mausam: { label: "भारत मौसम विज्ञान विभाग (IMD): मौसम और वर्षा", frequency: "दैनिक और दिन में कई बार", note: "पहुँच में है। जुड़ा नहीं है।" },
      nhb_statistics: { label: "राष्ट्रीय बागवानी बोर्ड: बागवानी सांख्यिकी", frequency: "वार्षिक", note: "पहुँच में है। जुड़ा नहीं है।" },
      open_meteo_current: { label: "Open-Meteo पूर्वानुमान API: वर्तमान स्थितियाँ", frequency: "मॉडल आउटपुट लगभग हर 15 मिनट में अपडेट; हर घंटे लाया जाता है", note: "लाइव सत्यापित।" },
      pau_potato_punjab: { label: "पंजाब में आलू की खेती (ज़िलेवार क्षेत्र, उत्पादन, पैदावार)", frequency: "वार्षिक (जब भी PAU पेज अपडेट करे); साप्ताहिक जाँच", note: "लाइव सत्यापित: HTML तालिका पढ़ी और जाँची गई (पैदावार = उत्पादन / क्षेत्र)।" },
    },
  },
};
export default server;
