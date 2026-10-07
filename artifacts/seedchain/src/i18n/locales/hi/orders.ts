import type { Orders } from "../en/orders";
const orders: Orders = {
  orders: {
    titleCustomer: "मेरे ऑर्डर", titleFarmer: "ग्राहक ऑर्डर", titleAdmin: "सभी ऑर्डर", subtitle: "किसान द्वारा हर ऑर्डर आगे बढ़ाते ही स्थिति लाइव अपडेट होती है।",
    filterStatus: "स्थिति से फ़िल्टर करें", allStatuses: "सभी स्थितियाँ", none: "अभी कोई ऑर्डर नहीं", noneCustomer: "उपज देखें और सीधे किसान से ऑर्डर करें।", noneOther: "ग्राहकों के ऑर्डर यहाँ तुरंत दिखते हैं।", browse: "उपज देखें",
    cols: { order: "ऑर्डर", farmer: "किसान", customer: "ग्राहक", items: "सामान", total: "कुल", fulfilment: "आपूर्ति", status: "स्थिति", placed: "दिया गया" },
    open: "खोलें", openActions: "खोलें · {{n}} कार्य",
    feedback: { title: "कैसा रहा?", stars: "{{n}} सितारे", placeholder: "वैकल्पिक टिप्पणी", send: "प्रतिक्रिया भेजें", thanks: "आपकी प्रतिक्रिया के लिए धन्यवाद", fail: "प्रतिक्रिया सहेजी नहीं जा सकी", customerFeedback: "ग्राहक की प्रतिक्रिया" },
    detail: {
      title: "ऑर्डर {{code}}", placed: "दिया गया {{time}}", allOrders: "सभी ऑर्डर", items: "सामान", total: "कुल", viewTrace: "लॉट ट्रेस देखें", next: "अगला कदम", history: "ऑर्डर का इतिहास",
      fulfilment: "आपूर्ति", method: "तरीका", deliverTo: "यहाँ पहुँचाएँ", courier: "कूरियर (केवल संदर्भ)", handover: "हस्तांतरण स्थान", notes: "टिप्पणी", customerNote: "ग्राहक की टिप्पणी",
      rejection: "अस्वीकृति का कारण", cancel: "रद्द करने का कारण", people: "लोग", farmer: "किसान", customer: "ग्राहक", customerPhone: "ग्राहक का फ़ोन", system: "सिस्टम",
    },
    actions: {
      accept: "ऑर्डर स्वीकार करें", reject: "अस्वीकार करें", prepare: "तैयारी शुरू करें", ready: "तैयार चिह्नित करें", dispatch: "भेजना दर्ज करें", complete: "डिलीवरी / हस्तांतरण दर्ज करें", cancel: "ऑर्डर रद्द करें", "confirm-receipt": "पुष्टि करें कि मुझे मिल गया",
    },
    dialog: {
      desc: "ऑर्डर {{code}}। यह लॉट के ट्रेसेबिलिटी इतिहास में स्थायी रूप से दर्ज होता है।", reasonCustomer: "कारण (ग्राहक को दिखेगा)", reason: "कारण", courierName: "कूरियर / ट्रांसपोर्टर का नाम",
      courierHint: "केवल संदर्भ के लिए दर्ज होता है। उन्हें SeedChain खाता नहीं मिलता।", consignment: "खेप / गाड़ी का संदर्भ (वैकल्पिक)", deliveryNotes: "डिलीवरी टिप्पणी (वैकल्पिक)",
      pickupLocation: "पिकअप स्थान", deliveryLocation: "डिलीवरी स्थान", gps: "मेरी वर्तमान GPS स्थिति जोड़ें (अनुमति माँगता है; कभी सार्वजनिक नहीं होती)", back: "वापस", confirm: "पुष्टि करें", saving: "सहेजा जा रहा है…",
      savedOffline: "ऑफ़लाइन सहेजा गया — सिंक की प्रतीक्षा में।", updated: "ऑर्डर अपडेट हुआ", fail: "ऑर्डर अपडेट नहीं हो सका",
    },
  },
  customer: {
    title: "आपका डैशबोर्ड", scan: "QR स्कैन करें", browse: "उपज देखें", active: "सक्रिय ऑर्डर", completed: "पूरे हुए ऑर्डर", spent: "कुल खर्च", spentHint: "केवल पुष्ट ऑर्डर",
    recentOrders: "हाल के ऑर्डर", noOrders: "अभी कोई ऑर्डर नहीं", recentLots: "हाल में सत्यापित लॉट", noScans: "अभी कोई स्कैन नहीं", noScansHint: "किसी भी SeedChain उपज पर QR स्कैन करें और देखें वह कहाँ से आई।", scanned: "स्कैन किया {{time}}",
  },
  enums: {
    orderEvent: {
      ORDER_CREATED: "ऑर्डर दिया गया; स्टॉक आरक्षित", ORDER_ACCEPTED: "किसान ने स्वीकार किया", ORDER_REJECTED: "किसान ने अस्वीकार किया", ORDER_PREPARED: "तैयार हो रहा है", ORDER_READY: "तैयार",
      ORDER_DISPATCHED: "भेजा गया", DELIVERY_COMPLETED: "डिलीवरी पूरी", CUSTOMER_PICKUP: "पिकअप पर सौंपा गया", CUSTOMER_RECEIVED: "ग्राहक ने प्राप्ति की पुष्टि की", ORDER_CANCELLED: "रद्द; स्टॉक वापस",
    },
  },
};
export default orders;
