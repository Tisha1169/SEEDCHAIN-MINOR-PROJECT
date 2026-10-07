import type { App } from "../en/app";
const app: App = {
  common: {
    loading: "लोड हो रहा है…", unavailable: "सेवा उपलब्ध नहीं", tryAgain: "फिर कोशिश करें", riskLevel: "{{level}} जोखिम",
    save: "सहेजें", cancel: "रद्द करें", close: "बंद करें", back: "वापस", next: "आगे", submit: "जमा करें", confirm: "पुष्टि करें", edit: "संपादित करें", delete: "हटाएँ",
    search: "खोजें", filter: "फ़िल्टर", refresh: "रिफ़्रेश", view: "देखें", details: "विवरण", all: "सभी", none: "कोई नहीं", yes: "हाँ", no: "नहीं",
    optional: "वैकल्पिक", required: "आवश्यक", actions: "कार्य", status: "स्थिति", date: "तारीख", name: "नाम", email: "ईमेल", phone: "फ़ोन",
    quantity: "मात्रा", price: "कीमत", total: "कुल", notes: "टिप्पणियाँ", reason: "कारण", saving: "सहेजा जा रहा है…", sending: "भेजा जा रहा है…",
  },
  layout: {
    nav: {
      dashboard: "डैशबोर्ड", farms: "खेत और उत्पाद", lots: "मेरे लॉट", inventory: "इन्वेंटरी", orders: "ऑर्डर", market: "बाज़ार और मौसम", alerts: "अलर्ट",
      scan: "QR स्कैन करें", account: "खाता", browse: "उपज देखें", myOrders: "मेरे ऑर्डर", command: "कमांड सेंटर", users: "उपयोगकर्ता और किसान",
      adminLots: "लॉट और QR कोड", events: "ट्रेस घटनाएँ", sources: "डेटा स्रोत", audit: "ऑडिट लॉग",
    },
    newLot: "नया लॉट", openMenu: "मेनू खोलें", closeMenu: "मेनू बंद करें", workspaceNav: "कार्यक्षेत्र नेविगेशन", signOut: "साइन आउट",
    pendingTitle: "एडमिन की मंज़ूरी का इंतज़ार है।",
    pendingBody: "आप अभी अपनी प्रोफ़ाइल पूरी कर सकते हैं; एडमिन द्वारा आपका खाता सत्यापित होने पर खेत, लॉट और QR कोड बनाना खुल जाएगा।",
    live: "लाइव अपडेट जुड़े हैं", polling: "हर 20 सेकंड में रिफ़्रेश", offline: "आप ऑफ़लाइन हैं",
    liveHint: "अपडेट सर्वर-सेंट इवेंट स्ट्रीम से आते हैं; उपलब्ध न होने पर ऐप हर 20 सेकंड में जाँचता है",
    sync: {
      pending: "ऑफ़लाइन सहेजा गया: {{n}} कार्य सिंक होने की प्रतीक्षा में हैं।",
      conflict: "सिंक टकराव: {{n}} कार्य सर्वर ने अस्वीकार किए और आपकी समीक्षा चाहिए।",
      syncNow: "अभी सिंक करें", done: "{{n}} कार्य सिंक हुए", still: "अभी भी ऑफ़लाइन है या सिंक करने को कुछ नहीं",
      rejected: "अस्वीकृत: {{error}}", nothingOverwritten: "कुछ भी ओवरराइट नहीं हुआ। रिकॉर्ड देखें और मान्य हो तो कार्य दोबारा दर्ज करें।", dismiss: "हटाएँ",
    },
  },
  misc: { primaryNav: "मुख्य", home: "SeedChain होम", artPotatoes: "गहरी मिट्टी पर कटे आलुओं का चित्र", artRows: "भोर में फ़सल की क्यारियों का चित्र", adminLotsTitle: "लॉट और QR कोड", adminLotsSub: "सभी किसानों के सभी लॉट।" },
  authShell: { brand: "SeedChain", line1: "हर फ़सल की", line2: "एक कहानी है।" },
};
export default app;
