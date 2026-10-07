import type { Admin } from "../en/admin";
const admin: Admin = {
  admin: {
    dash: {
      title: "कमांड सेंटर", subtitle: "लाइव डेटाबेस मान · बनाया गया {{time}}", pending: "{{n}} किसान आवेदन मंज़ूरी की प्रतीक्षा में →",
      farmers: "किसान", verified: "{{n}} सत्यापित", activeLots: "सक्रिय लॉट", scansToday: "आज के QR स्कैन", ordersToday: "आज के ऑर्डर", completedOverall: "कुल {{n}} पूरे हुए",
      available: "उपलब्ध", reserved: "आरक्षित", sold: "बिका", lossRate: "नुकसान दर {{n}}%", customers: "ग्राहक", traceEvents: "ट्रेस घटनाएँ", openAlerts: "खुले अलर्ट",
      highRisk: "उच्च जोखिम वाले लॉट", rulesNotAi: "पारदर्शी नियम, AI नहीं", pendingFarmers: "लंबित किसान",
      orders: "ऑर्डर", scans: "QR स्कैन", last14: "पिछले 14 दिन", invByFarmer: "किसान के अनुसार इन्वेंटरी", invByFarmerSub: "शीर्ष 10 · उपलब्ध / आरक्षित / बिका", lotsByStatus: "स्थिति के अनुसार लॉट",
      riskDist: "जोखिम वितरण", riskSub: "नियम-आधारित (rules-v1)", potatoPrice: "आलू का मॉडल मूल्य", potatoPriceSub: "रुपये / क्विंटल · बाहरी, data.gov.in", noData: "अभी डेटा नहीं", dataHealth: "डेटा स्वास्थ्य: हर बाहरी स्रोत",
    },
    users: {
      title: "उपयोगकर्ता और किसान", subtitle: "लॉट और QR कोड बनाने से पहले किसानों को मंज़ूरी दें।", allRoles: "सभी भूमिकाएँ", farmers: "किसान", customers: "ग्राहक", admins: "एडमिन",
      cols: { name: "नाम", email: "ईमेल", role: "भूमिका", status: "स्थिति", profile: "स्थान / सार्वजनिक प्रोफ़ाइल", joined: "जुड़े" },
      approve: "मंज़ूर करें", reject: "अस्वीकार करें", suspend: "निलंबित करें", reactivate: "फिर चालू करें", done: "{{action}} हो गया", failed: "विफल",
      dlgTitle: "{{name}}: {{action}}", auditNote: "ऑडिट लॉग में दर्ज होता है।", reasonRequired: "कारण (आवश्यक)", noteOptional: "सत्यापन टिप्पणी (वैकल्पिक)", cancel: "रद्द करें", confirm: "पुष्टि करें",
    },
    events: {
      title: "ट्रेस घटनाएँ", subtitle: "हर लॉट का केवल-जुड़ने वाला इतिहास।", filter: "प्रकार से फ़िल्टर करें, जैसे ORDER_CREATED",
      cols: { recorded: "दर्ज", lot: "लॉट", event: "घटना", who: "किसने", qty: "मात्रा Δ", reason: "कारण", source: "स्रोत" },
      latestScans: "ताज़ा QR स्कैन", scanCols: { time: "समय", lot: "लॉट", qrv: "QR v", result: "नतीजा", source: "स्रोत", device: "डिवाइस", signedIn: "साइन इन" }, yes: "हाँ", no: "नहीं", system: "सिस्टम",
    },
    audit: { title: "ऑडिट लॉग", subtitle: "किसने क्या किया, किस रिकॉर्ड पर, पहले/बाद के मानों के साथ।", cols: { when: "कब", who: "किसने", action: "कार्य", entity: "इकाई", change: "बदलाव", request: "अनुरोध" }, system: "सिस्टम" },
    sources: {
      title: "बाहरी डेटा स्रोत", subtitle: "स्रोत-वंशावली के साथ बैकएंड से डेटा लाना। ब्राउज़र कभी इन API को सीधे नहीं बुलाता।", runNow: "अभी चलाएँ", runFailed: "चलाना विफल", recordsToast: "{{status}}: {{n}} रिकॉर्ड",
      cols: { started: "शुरू", status: "स्थिति", records: "रिकॉर्ड", version: "संस्करण", endpoint: "एंडपॉइंट (गोपनीय हटाए गए)", error: "त्रुटि" },
    },
  },
  enums: {
    scanResult: { OK: "ठीक", UNKNOWN: "अज्ञात", REVOKED: "रद्द", REPLACED: "बदला गया", INVALID: "अमान्य", DISABLED: "बंद" },
    scanSource: { camera_link: "फ़ोन कैमरा लिंक", in_app_scanner: "ऐप स्कैनर", manual_entry: "हाथ से दर्ज" },
    device: { mobile: "मोबाइल", desktop: "डेस्कटॉप" },
    runStatus: { SUCCESS: "सफल", FAILED: "विफल", PARTIAL: "आंशिक", SKIPPED: "छोड़ा गया" },
    userAction: { approve: "मंज़ूर करें", reject: "अस्वीकार करें", suspend: "निलंबित करें", reactivate: "फिर चालू करें" },
  },
};
export default admin;
