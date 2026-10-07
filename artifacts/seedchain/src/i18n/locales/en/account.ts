const account = {
  auth: {
    serviceDown: "The SeedChain service is temporarily unavailable.",
    welcomeBack: "Welcome back", signIn: "Sign in", signInSub: "Farmers, customers and administrators.", email: "Email", password: "Password",
    signingIn: "Signing in…", newHere: "New here?", createAccountLink: "Create an account",
    join: "Join SeedChain", createTitle: "Create your account", iAmCustomer: "I am a customer", iAmFarmer: "I am a farmer",
    farmerReview: "Farmer accounts are reviewed by a SeedChain admin before you can create farms, lots and QR codes.",
    fullName: "Full name", phone: "Phone", phoneFarmerHint: "Shared only with customers who order from you.", phoneCustomerHint: "Shared only with the farmer you order from.",
    passwordHint: "At least 10 characters.", publicName: "Public farm / farmer name", publicNameHint: "Shown to customers on QR trace pages.", publicNamePh: "e.g. Gurpreet Farms",
    village: "Village", district: "District", state: "State", statePh: "e.g. Punjab", aboutPublic: "About you (public)", cityArea: "City / area (optional)",
    creating: "Creating…", createAccount: "Create account", alreadyRegistered: "Already registered?",
  },
  account: {
    title: "Account", subtitle: "Your profile and session.", fullName: "Full name", phone: "Phone", location: "Location",
    phoneCustomerHint: "Shared only with the farmer you order from.", phoneFarmerHint: "Shared only with customers who order from you.",
    publicProfile: "Public farmer profile (shown on QR pages)", publicName: "Public name", village: "Village", district: "District", state: "State", about: "About",
    saving: "Saving…", saveChanges: "Save changes", session: "Session", email: "Email", role: "Role", status: "Status", verification: "Verification",
    pendingReview: "Pending admin review", memberSince: "Member since", liveUpdates: "Live updates", connected: "Connected", polling: "Polling every 20 s", offline: "Offline",
    signOut: "Sign out", noPasswordReset: "Self-service password change and reset are not available yet. Keep your password safe; this is a known limitation of the pilot build.",
    saved: "Profile saved", saveFailed: "Could not save",
  },
  alerts: {
    title: "Alerts", subtitle: "Raised automatically by integrity checks, risk rules, scans and external data health.", open: "Open", all: "All",
    noneTitle: "No alerts", noneHint: "Nothing needs attention.", resolved: "Resolved", acknowledged: "acknowledged", openLot: "open lot", openOrder: "open order",
    acknowledge: "Acknowledge", resolve: "Resolve", failed: "Failed",
  },
  inventory: {
    title: "Inventory", subtitle: "Computed from the database in real time. Reserved stock is held for open orders; sold stock is customer-confirmed.",
    harvested: "Harvested", available: "Available", reserved: "Reserved", sold: "Sold", loss: "Loss", noLots: "No lots yet",
    lot: "Lot", product: "Product", farmer: "Farmer", status: "Status", stock: "Stock", availableLabel: "{{qty}} available",
    footer: "Every change to these numbers is a permanent event in the lot's history. Changing stock requires recording an event, never an edit.",
  },
  notFound: { title: "404", body: "This page does not exist.", home: "Go home" },
  enums: {
    severity: { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" },
    alertType: {
      EXTERNAL_DATA_FAILURE: "External data failure", INVALID_QR: "Invalid QR", INVENTORY_MISMATCH: "Inventory mismatch", LONG_DELAY: "Long delay", LOT_RECALLED: "Lot recalled",
      LOT_RECALL_CLEARED: "Recall cleared", ORDER_ACCEPTED: "Order accepted", ORDER_CANCELLED: "Order cancelled", ORDER_CONFIRMED: "Order confirmed", ORDER_DELIVERED: "Order delivered",
      ORDER_DISPATCHED: "Order dispatched", ORDER_NEW: "New order", ORDER_REJECTED: "Order declined", OVER_ORDER: "Over-order", QR_ANOMALY: "Potential QR anomaly", QR_DISABLED: "QR disabled",
      QR_ENABLED: "QR enabled", QR_REVOKED: "QR revoked", REVIEW_HIDDEN: "Review hidden", REVIEW_RECEIVED: "Review received", REVOKED_QR: "Revoked QR scanned", SPOILAGE_RISK: "Spoilage risk",
    },
  },
};
export default account;
export type Account = typeof account;
