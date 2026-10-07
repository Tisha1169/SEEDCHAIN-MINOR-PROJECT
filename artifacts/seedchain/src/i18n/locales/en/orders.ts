const orders = {
  orders: {
    titleCustomer: "My orders", titleFarmer: "Customer orders", titleAdmin: "All orders", subtitle: "Statuses update live as the farmer progresses each order.",
    filterStatus: "Filter by status", allStatuses: "All statuses", none: "No orders yet", noneCustomer: "Browse produce and order directly from a farmer.", noneOther: "Orders from customers appear here instantly.", browse: "Browse produce",
    cols: { order: "Order", farmer: "Farmer", customer: "Customer", items: "Items", total: "Total", fulfilment: "Fulfilment", status: "Status", placed: "Placed" },
    open: "Open", openActions: "Open · {{n}} action",
    feedback: { title: "How was it?", stars: "{{n}} stars", placeholder: "Optional comment", send: "Send feedback", thanks: "Thanks for your feedback", fail: "Could not save feedback", customerFeedback: "Customer feedback" },
    detail: {
      title: "Order {{code}}", placed: "Placed {{time}}", allOrders: "All orders", items: "Items", total: "Total", viewTrace: "View lot trace", next: "Next step", history: "Order history",
      fulfilment: "Fulfilment", method: "Method", deliverTo: "Deliver to", courier: "Courier (reference only)", handover: "Handover location", notes: "Notes", customerNote: "Customer note",
      rejection: "Rejection reason", cancel: "Cancel reason", people: "People", farmer: "Farmer", customer: "Customer", customerPhone: "Customer phone", system: "System",
    },
    actions: {
      accept: "Accept order", reject: "Reject", prepare: "Start preparing", ready: "Mark ready", dispatch: "Record dispatch", complete: "Record delivery / handover", cancel: "Cancel order", "confirm-receipt": "Confirm I received it",
    },
    dialog: {
      desc: "Order {{code}}. This is recorded permanently in the lot's traceability history.", reasonCustomer: "Reason (shown to customer)", reason: "Reason", courierName: "Courier / transporter name",
      courierHint: "Recorded for reference only. They do not get a SeedChain account.", consignment: "Consignment / vehicle reference (optional)", deliveryNotes: "Delivery notes (optional)",
      pickupLocation: "Pickup location", deliveryLocation: "Delivery location", gps: "Attach my current GPS position (asks for permission; never stored publicly)", back: "Back", confirm: "Confirm", saving: "Saving…",
      savedOffline: "Saved offline — waiting for synchronization.", updated: "Order updated", fail: "Could not update order",
    },
  },
  customer: {
    title: "Your dashboard", scan: "Scan a QR", browse: "Browse produce", active: "Active orders", completed: "Completed orders", spent: "Total spent", spentHint: "Confirmed orders only",
    recentOrders: "Recent orders", noOrders: "No orders yet", recentLots: "Recently verified lots", noScans: "No scans yet", noScansHint: "Scan the QR on any SeedChain produce to see where it came from.", scanned: "scanned {{time}}",
  },
  enums: {
    orderEvent: {
      ORDER_CREATED: "Order placed; stock reserved", ORDER_ACCEPTED: "Accepted by farmer", ORDER_REJECTED: "Rejected by farmer", ORDER_PREPARED: "Being prepared", ORDER_READY: "Ready",
      ORDER_DISPATCHED: "Dispatched", DELIVERY_COMPLETED: "Delivery completed", CUSTOMER_PICKUP: "Handed over at pickup", CUSTOMER_RECEIVED: "Customer confirmed receipt", ORDER_CANCELLED: "Cancelled; stock released",
    },
  },
};
export default orders;
export type Orders = typeof orders;
