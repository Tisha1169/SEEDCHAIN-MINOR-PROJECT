import type { Orders } from "../en/orders";
const orders: Orders = {
  orders: {
    titleCustomer: "ਮੇਰੇ ਆਰਡਰ", titleFarmer: "ਗਾਹਕ ਆਰਡਰ", titleAdmin: "ਸਾਰੇ ਆਰਡਰ", subtitle: "ਕਿਸਾਨ ਵੱਲੋਂ ਹਰ ਆਰਡਰ ਅੱਗੇ ਵਧਾਉਂਦੇ ਹੀ ਸਥਿਤੀ ਲਾਈਵ ਅੱਪਡੇਟ ਹੁੰਦੀ ਹੈ।",
    filterStatus: "ਸਥਿਤੀ ਮੁਤਾਬਕ ਫਿਲਟਰ ਕਰੋ", allStatuses: "ਸਾਰੀਆਂ ਸਥਿਤੀਆਂ", none: "ਹਾਲੇ ਕੋਈ ਆਰਡਰ ਨਹੀਂ", noneCustomer: "ਉਪਜ ਵੇਖੋ ਅਤੇ ਸਿੱਧਾ ਕਿਸਾਨ ਤੋਂ ਆਰਡਰ ਕਰੋ।", noneOther: "ਗਾਹਕਾਂ ਦੇ ਆਰਡਰ ਇੱਥੇ ਤੁਰੰਤ ਦਿਸਦੇ ਹਨ।", browse: "ਉਪਜ ਵੇਖੋ",
    cols: { order: "ਆਰਡਰ", farmer: "ਕਿਸਾਨ", customer: "ਗਾਹਕ", items: "ਸਾਮਾਨ", total: "ਕੁੱਲ", fulfilment: "ਸਪਲਾਈ", status: "ਸਥਿਤੀ", placed: "ਦਿੱਤਾ ਗਿਆ" },
    open: "ਖੋਲ੍ਹੋ", openActions: "ਖੋਲ੍ਹੋ · {{n}} ਕਾਰਵਾਈ",
    feedback: { title: "ਕਿਵੇਂ ਰਿਹਾ?", stars: "{{n}} ਤਾਰੇ", placeholder: "ਚੋਣਵੀਂ ਟਿੱਪਣੀ", send: "ਫੀਡਬੈਕ ਭੇਜੋ", thanks: "ਤੁਹਾਡੇ ਫੀਡਬੈਕ ਲਈ ਧੰਨਵਾਦ", fail: "ਫੀਡਬੈਕ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ", customerFeedback: "ਗਾਹਕ ਦਾ ਫੀਡਬੈਕ" },
    detail: {
      title: "ਆਰਡਰ {{code}}", placed: "ਦਿੱਤਾ ਗਿਆ {{time}}", allOrders: "ਸਾਰੇ ਆਰਡਰ", items: "ਸਾਮਾਨ", total: "ਕੁੱਲ", viewTrace: "ਲਾਟ ਟਰੇਸ ਵੇਖੋ", next: "ਅਗਲਾ ਕਦਮ", history: "ਆਰਡਰ ਦਾ ਇਤਿਹਾਸ",
      fulfilment: "ਸਪਲਾਈ", method: "ਤਰੀਕਾ", deliverTo: "ਇੱਥੇ ਪਹੁੰਚਾਓ", courier: "ਕੋਰੀਅਰ (ਸਿਰਫ਼ ਹਵਾਲਾ)", handover: "ਹਵਾਲਗੀ ਥਾਂ", notes: "ਨੋਟ", customerNote: "ਗਾਹਕ ਦਾ ਨੋਟ",
      rejection: "ਇਨਕਾਰ ਦਾ ਕਾਰਨ", cancel: "ਰੱਦ ਕਰਨ ਦਾ ਕਾਰਨ", people: "ਲੋਕ", farmer: "ਕਿਸਾਨ", customer: "ਗਾਹਕ", customerPhone: "ਗਾਹਕ ਦਾ ਫ਼ੋਨ", system: "ਸਿਸਟਮ",
    },
    actions: {
      accept: "ਆਰਡਰ ਮਨਜ਼ੂਰ ਕਰੋ", reject: "ਇਨਕਾਰ ਕਰੋ", prepare: "ਤਿਆਰੀ ਸ਼ੁਰੂ ਕਰੋ", ready: "ਤਿਆਰ ਚਿੰਨ੍ਹਤ ਕਰੋ", dispatch: "ਭੇਜਣਾ ਦਰਜ ਕਰੋ", complete: "ਡਿਲੀਵਰੀ / ਹਵਾਲਗੀ ਦਰਜ ਕਰੋ", cancel: "ਆਰਡਰ ਰੱਦ ਕਰੋ", "confirm-receipt": "ਪੁਸ਼ਟੀ ਕਰੋ ਕਿ ਮੈਨੂੰ ਮਿਲ ਗਿਆ",
    },
    dialog: {
      desc: "ਆਰਡਰ {{code}}। ਇਹ ਲਾਟ ਦੇ ਟਰੇਸਬਿਲਟੀ ਇਤਿਹਾਸ ਵਿੱਚ ਪੱਕੇ ਤੌਰ ’ਤੇ ਦਰਜ ਹੁੰਦਾ ਹੈ।", reasonCustomer: "ਕਾਰਨ (ਗਾਹਕ ਨੂੰ ਦਿਸੇਗਾ)", reason: "ਕਾਰਨ", courierName: "ਕੋਰੀਅਰ / ਟਰਾਂਸਪੋਰਟਰ ਦਾ ਨਾਮ",
      courierHint: "ਸਿਰਫ਼ ਹਵਾਲੇ ਲਈ ਦਰਜ ਹੁੰਦਾ ਹੈ। ਉਨ੍ਹਾਂ ਨੂੰ SeedChain ਖਾਤਾ ਨਹੀਂ ਮਿਲਦਾ।", consignment: "ਖੇਪ / ਗੱਡੀ ਦਾ ਹਵਾਲਾ (ਚੋਣਵਾਂ)", deliveryNotes: "ਡਿਲੀਵਰੀ ਨੋਟ (ਚੋਣਵਾਂ)",
      pickupLocation: "ਪਿਕਅੱਪ ਥਾਂ", deliveryLocation: "ਡਿਲੀਵਰੀ ਥਾਂ", gps: "ਮੇਰੀ ਮੌਜੂਦਾ GPS ਸਥਿਤੀ ਜੋੜੋ (ਇਜਾਜ਼ਤ ਮੰਗਦਾ ਹੈ; ਕਦੇ ਜਨਤਕ ਨਹੀਂ ਹੁੰਦੀ)", back: "ਪਿੱਛੇ", confirm: "ਪੁਸ਼ਟੀ ਕਰੋ", saving: "ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
      savedOffline: "ਆਫ਼ਲਾਈਨ ਸੰਭਾਲਿਆ — ਸਿੰਕ ਦੀ ਉਡੀਕ ਵਿੱਚ।", updated: "ਆਰਡਰ ਅੱਪਡੇਟ ਹੋਇਆ", fail: "ਆਰਡਰ ਅੱਪਡੇਟ ਨਹੀਂ ਹੋ ਸਕਿਆ",
    },
  },
  customer: {
    title: "ਤੁਹਾਡਾ ਡੈਸ਼ਬੋਰਡ", scan: "QR ਸਕੈਨ ਕਰੋ", browse: "ਉਪਜ ਵੇਖੋ", active: "ਸਰਗਰਮ ਆਰਡਰ", completed: "ਪੂਰੇ ਹੋਏ ਆਰਡਰ", spent: "ਕੁੱਲ ਖਰਚ", spentHint: "ਸਿਰਫ਼ ਪੁਸ਼ਟ ਆਰਡਰ",
    recentOrders: "ਹਾਲੀਆ ਆਰਡਰ", noOrders: "ਹਾਲੇ ਕੋਈ ਆਰਡਰ ਨਹੀਂ", recentLots: "ਹਾਲ ਵਿੱਚ ਤਸਦੀਕ ਕੀਤੇ ਲਾਟ", noScans: "ਹਾਲੇ ਕੋਈ ਸਕੈਨ ਨਹੀਂ", noScansHint: "ਕਿਸੇ ਵੀ SeedChain ਉਪਜ ’ਤੇ QR ਸਕੈਨ ਕਰੋ ਅਤੇ ਵੇਖੋ ਉਹ ਕਿੱਥੋਂ ਆਈ।", scanned: "ਸਕੈਨ ਕੀਤਾ {{time}}",
  },
  enums: {
    orderEvent: {
      ORDER_CREATED: "ਆਰਡਰ ਦਿੱਤਾ ਗਿਆ; ਸਟਾਕ ਰਾਖਵਾਂ", ORDER_ACCEPTED: "ਕਿਸਾਨ ਨੇ ਮਨਜ਼ੂਰ ਕੀਤਾ", ORDER_REJECTED: "ਕਿਸਾਨ ਨੇ ਇਨਕਾਰ ਕੀਤਾ", ORDER_PREPARED: "ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ", ORDER_READY: "ਤਿਆਰ",
      ORDER_DISPATCHED: "ਭੇਜਿਆ ਗਿਆ", DELIVERY_COMPLETED: "ਡਿਲੀਵਰੀ ਪੂਰੀ", CUSTOMER_PICKUP: "ਪਿਕਅੱਪ ’ਤੇ ਸੌਂਪਿਆ ਗਿਆ", CUSTOMER_RECEIVED: "ਗਾਹਕ ਨੇ ਪ੍ਰਾਪਤੀ ਦੀ ਪੁਸ਼ਟੀ ਕੀਤੀ", ORDER_CANCELLED: "ਰੱਦ; ਸਟਾਕ ਵਾਪਸ",
    },
  },
};
export default orders;
