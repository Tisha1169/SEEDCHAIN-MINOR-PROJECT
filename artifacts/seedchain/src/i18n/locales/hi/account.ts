import type { Account } from "../en/account";
const account: Account = {
  auth: {
    serviceDown: "SeedChain सेवा अभी अस्थायी रूप से उपलब्ध नहीं है।",
    welcomeBack: "वापसी पर स्वागत है", signIn: "साइन इन", signInSub: "किसान, ग्राहक और एडमिन।", email: "ईमेल", password: "पासवर्ड",
    signingIn: "साइन इन हो रहा है…", newHere: "नए हैं?", createAccountLink: "खाता बनाएँ",
    join: "SeedChain से जुड़ें", createTitle: "अपना खाता बनाएँ", iAmCustomer: "मैं ग्राहक हूँ", iAmFarmer: "मैं किसान हूँ",
    farmerReview: "खेत, लॉट और QR कोड बनाने से पहले किसान खातों की समीक्षा SeedChain एडमिन करते हैं।",
    fullName: "पूरा नाम", phone: "फ़ोन", phoneFarmerHint: "केवल उन ग्राहकों को दिखेगा जो आपसे ऑर्डर करते हैं।", phoneCustomerHint: "केवल उस किसान को दिखेगा जिससे आप ऑर्डर करते हैं।",
    passwordHint: "कम से कम 10 अक्षर।", publicName: "सार्वजनिक खेत / किसान का नाम", publicNameHint: "QR ट्रेस पेज पर ग्राहकों को दिखता है।", publicNamePh: "जैसे गुरप्रीत फ़ार्म्स",
    village: "गाँव", district: "ज़िला", state: "राज्य", statePh: "जैसे पंजाब", aboutPublic: "आपके बारे में (सार्वजनिक)", cityArea: "शहर / इलाका (वैकल्पिक)",
    creating: "बनाया जा रहा है…", createAccount: "खाता बनाएँ", alreadyRegistered: "पहले से पंजीकृत हैं?",
  },
  account: {
    title: "खाता", subtitle: "आपकी प्रोफ़ाइल और सत्र।", fullName: "पूरा नाम", phone: "फ़ोन", location: "स्थान",
    phoneCustomerHint: "केवल उस किसान को दिखेगा जिससे आप ऑर्डर करते हैं।", phoneFarmerHint: "केवल उन ग्राहकों को दिखेगा जो आपसे ऑर्डर करते हैं।",
    publicProfile: "सार्वजनिक किसान प्रोफ़ाइल (QR पेज पर दिखती है)", publicName: "सार्वजनिक नाम", village: "गाँव", district: "ज़िला", state: "राज्य", about: "परिचय",
    saving: "सहेजा जा रहा है…", saveChanges: "बदलाव सहेजें", session: "सत्र", email: "ईमेल", role: "भूमिका", status: "स्थिति", verification: "सत्यापन",
    pendingReview: "एडमिन समीक्षा लंबित", memberSince: "सदस्यता की तारीख", liveUpdates: "लाइव अपडेट", connected: "जुड़ा है", polling: "हर 20 सेकंड में जाँच", offline: "ऑफ़लाइन",
    signOut: "साइन आउट", noPasswordReset: "पासवर्ड बदलने और रीसेट करने की सुविधा अभी उपलब्ध नहीं है। अपना पासवर्ड सुरक्षित रखें; यह पायलट संस्करण की ज्ञात सीमा है।",
    saved: "प्रोफ़ाइल सहेजी गई", saveFailed: "सहेजा नहीं जा सका",
  },
  alerts: {
    title: "अलर्ट", subtitle: "अखंडता जाँच, जोखिम नियमों, स्कैन और बाहरी डेटा की स्थिति से अपने-आप उठाए जाते हैं।", open: "खुले", all: "सभी",
    noneTitle: "कोई अलर्ट नहीं", noneHint: "किसी चीज़ पर ध्यान देने की ज़रूरत नहीं।", resolved: "सुलझा", acknowledged: "स्वीकार किया", openLot: "लॉट खोलें", openOrder: "ऑर्डर खोलें",
    acknowledge: "स्वीकार करें", resolve: "सुलझाएँ", failed: "विफल",
  },
  inventory: {
    title: "इन्वेंटरी", subtitle: "डेटाबेस से रीयल-टाइम में गणना। आरक्षित स्टॉक खुले ऑर्डर के लिए रखा है; बिका स्टॉक ग्राहक द्वारा पुष्ट है।",
    harvested: "कटाई", available: "उपलब्ध", reserved: "आरक्षित", sold: "बिका", loss: "नुकसान", noLots: "अभी कोई लॉट नहीं",
    lot: "लॉट", product: "उत्पाद", farmer: "किसान", status: "स्थिति", stock: "स्टॉक", availableLabel: "{{qty}} उपलब्ध",
    footer: "इन आँकड़ों में हर बदलाव लॉट के इतिहास में स्थायी घटना है। स्टॉक बदलने के लिए घटना दर्ज करनी होती है, संपादन नहीं।",
  },
  notFound: { title: "404", body: "यह पेज मौजूद नहीं है।", home: "होम पर जाएँ" },
  enums: {
    severity: { LOW: "कम", MEDIUM: "मध्यम", HIGH: "अधिक", CRITICAL: "गंभीर" },
    alertType: {
      UNAUTHORIZED_ACTION: "अनधिकृत कार्य",       EXTERNAL_DATA_FAILURE: "बाहरी डेटा विफलता", INVALID_QR: "अमान्य QR", INVENTORY_MISMATCH: "इन्वेंटरी में अंतर", LONG_DELAY: "लंबी देरी", LOT_RECALLED: "लॉट वापस बुलाया गया",
      LOT_RECALL_CLEARED: "वापसी रद्द", ORDER_ACCEPTED: "ऑर्डर स्वीकृत", ORDER_CANCELLED: "ऑर्डर रद्द", ORDER_CONFIRMED: "ऑर्डर की पुष्टि", ORDER_DELIVERED: "ऑर्डर पहुँचाया गया",
      ORDER_DISPATCHED: "ऑर्डर भेजा गया", ORDER_NEW: "नया ऑर्डर", ORDER_REJECTED: "ऑर्डर अस्वीकृत", OVER_ORDER: "अधिक ऑर्डर", QR_ANOMALY: "संभावित QR विसंगति", QR_DISABLED: "QR बंद",
      QR_ENABLED: "QR चालू", QR_REVOKED: "QR रद्द", REVIEW_HIDDEN: "समीक्षा छिपाई गई", REVIEW_RECEIVED: "समीक्षा मिली", REVOKED_QR: "रद्द QR स्कैन हुआ", SPOILAGE_RISK: "खराबी का जोखिम",
    },
  },
};
export default account;
