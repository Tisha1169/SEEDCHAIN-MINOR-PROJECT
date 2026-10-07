const admin = {
  admin: {
    dash: {
      title: "Command center", subtitle: "Live database values · generated {{time}}", pending: "{{n}} farmer application(s) waiting for approval →",
      farmers: "Farmers", verified: "{{n}} verified", activeLots: "Active lots", scansToday: "QR scans today", ordersToday: "Orders today", completedOverall: "{{n}} completed overall",
      available: "Available", reserved: "Reserved", sold: "Sold", lossRate: "Loss rate {{n}}%", customers: "Customers", traceEvents: "Trace events", openAlerts: "Open alerts",
      highRisk: "High-risk lots", rulesNotAi: "Transparent rules, not AI", pendingFarmers: "Pending farmers",
      orders: "Orders", scans: "QR scans", last14: "Last 14 days", invByFarmer: "Inventory by farmer", invByFarmerSub: "Top 10 · available / reserved / sold", lotsByStatus: "Lots by status",
      riskDist: "Risk distribution", riskSub: "Rule-based (rules-v1)", potatoPrice: "Potato modal price", potatoPriceSub: "INR / quintal · external, data.gov.in", noData: "No data yet", dataHealth: "Data health: every external source",
    },
    users: {
      title: "Users & farmers", subtitle: "Approve farmers before they can create lots and QR codes.", allRoles: "All roles", farmers: "Farmers", customers: "Customers", admins: "Admins",
      cols: { name: "Name", email: "Email", role: "Role", status: "Status", profile: "Location / public profile", joined: "Joined" },
      approve: "Approve", reject: "Reject", suspend: "Suspend", reactivate: "Reactivate", done: "{{action}} done", failed: "Failed",
      dlgTitle: "{{action}} {{name}}", auditNote: "Recorded in the audit log.", reasonRequired: "Reason (required)", noteOptional: "Verification note (optional)", cancel: "Cancel", confirm: "Confirm",
    },
    events: {
      title: "Trace events", subtitle: "Append-only history across every lot.", filter: "Filter by type, e.g. ORDER_CREATED",
      cols: { recorded: "Recorded", lot: "Lot", event: "Event", who: "Who", qty: "Qty Δ", reason: "Reason", source: "Source" },
      latestScans: "Latest QR scans", scanCols: { time: "Time", lot: "Lot", qrv: "QR v", result: "Result", source: "Source", device: "Device", signedIn: "Signed in" }, yes: "yes", no: "no", system: "System",
    },
    audit: { title: "Audit log", subtitle: "Who did what, to which record, with before/after values.", cols: { when: "When", who: "Who", action: "Action", entity: "Entity", change: "Change", request: "Request" }, system: "system" },
    sources: {
      title: "External data sources", subtitle: "Backend ingestion with lineage. The browser never calls these APIs directly.", runNow: "Run now", runFailed: "Run failed", recordsToast: "{{status}}: {{n}} record(s)",
      cols: { started: "Started", status: "Status", records: "Records", version: "Version", endpoint: "Endpoint (secrets redacted)", error: "Error" },
    },
  },
  enums: {
    scanResult: { OK: "OK", UNKNOWN: "Unknown", REVOKED: "Revoked", REPLACED: "Replaced", INVALID: "Invalid", DISABLED: "Disabled" },
    scanSource: { camera_link: "Phone camera link", in_app_scanner: "In-app scanner", manual_entry: "Manual entry" },
    device: { mobile: "Mobile", desktop: "Desktop" },
    runStatus: { SUCCESS: "Success", FAILED: "Failed", PARTIAL: "Partial", SKIPPED: "Skipped" },
    userAction: { approve: "Approve", reject: "Reject", suspend: "Suspend", reactivate: "Reactivate" },
  },
};
export default admin;
export type Admin = typeof admin;
