const app = {
  common: {
    loading: "Loading…", unavailable: "Service unavailable", tryAgain: "Try again", riskLevel: "{{level}} risk",
    save: "Save", cancel: "Cancel", close: "Close", back: "Back", next: "Next", submit: "Submit", confirm: "Confirm", edit: "Edit", delete: "Delete",
    search: "Search", filter: "Filter", refresh: "Refresh", view: "View", details: "Details", all: "All", none: "None", yes: "Yes", no: "No",
    optional: "optional", required: "required", actions: "Actions", status: "Status", date: "Date", name: "Name", email: "Email", phone: "Phone",
    quantity: "Quantity", price: "Price", total: "Total", notes: "Notes", reason: "Reason", saving: "Saving…", sending: "Sending…",
  },
  layout: {
    nav: {
      dashboard: "Dashboard", farms: "Farms & products", lots: "My lots", inventory: "Inventory", orders: "Orders", market: "Market & weather", alerts: "Alerts",
      scan: "Scan a QR", account: "Account", browse: "Browse produce", myOrders: "My orders", command: "Command center", users: "Users & farmers",
      adminLots: "Lots & QR codes", events: "Trace events", sources: "Data sources", audit: "Audit log",
    },
    newLot: "New lot", openMenu: "Open menu", closeMenu: "Close menu", workspaceNav: "Workspace navigation", signOut: "Sign out",
    pendingTitle: "Awaiting admin approval.",
    pendingBody: "You can complete your profile now; creating farms, lots and QR codes unlocks once an admin verifies your account.",
    live: "Live updates connected", polling: "Refreshing every 20 s", offline: "You are offline",
    liveHint: "Updates arrive over a server-sent event stream; if unavailable the app polls every 20 s",
    sync: {
      pending: "Saved offline: {{n}} action(s) waiting for synchronization.",
      conflict: "SYNC_CONFLICT: {{n}} action(s) were rejected by the server and need your review.",
      syncNow: "Sync now", done: "{{n}} action(s) synchronized", still: "Still offline or nothing to sync",
      rejected: "Rejected: {{error}}", nothingOverwritten: "Nothing was overwritten. Review the record and re-enter the action if it is still valid.", dismiss: "Dismiss",
    },
  },
  misc: { primaryNav: "Primary", home: "SeedChain home", artPotatoes: "Illustration of harvested potatoes on dark soil", artRows: "Illustration of crop rows at dawn", adminLotsTitle: "Lots & QR codes", adminLotsSub: "All lots across farmers." },
  authShell: { brand: "SeedChain", line1: "Every harvest", line2: "has a story." },
};
export default app;
export type App = typeof app;
