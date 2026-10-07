const pub = {
  market: {
    verifiedFarmer: "VERIFIED FARMER", registered: "REGISTERED", perUnit: "PER {{unit}}", availableQty: "{{qty}} available", gradeSuffix: " · Grade {{g}}",
    eyebrow: "Marketplace", h1a: "Buy direct", h1b: "from farmers.", lead: "Every lot has its own QR identity. No middlemen: orders go straight to the farmer.",
    searchPh: "Search variety, farmer or place", statePh: "State (e.g. Punjab)", noneTitle: "No produce is listed right now", noneHint: "Farmers list produce after harvest. Check back soon.",
    placed: "Order placed", placedBody: "{{code}}. Stock is reserved for you.", couldNotPlace: "Could not place order",
    perUnitLine: "per {{unit}}", available: "Available", quality: "Quality", notGraded: "Not graded", grade: "Grade {{g}}", harvested: "Harvested", origin: "Origin", farm: "Farm", lot: "Lot", farmer: "Farmer",
    viewTrace: "View traceability", orderFrom: "Order from the farmer", signInToOrder: "Sign in as a customer to order.", signIn: "Sign in", createAccount: "Create account",
    onlyCustomers: "Only customer accounts can place orders. You are signed in as a {{role}}.", quantityUnit: "Quantity ({{unit}})", fulfilment: "Fulfilment", deliveryAddress: "Delivery address",
    noteFarmer: "Note for the farmer (optional)", total: "Total", placing: "Placing order…", placeOrder: "Place order", reservedNote: "Stock is reserved for you immediately. The farmer then accepts or declines.",
    farmerAlt: "Farmland at sunrise", memberSince: "member since {{date}}", farms: "Farms: {{names}}", identityReviewed: "Identity reviewed by a SeedChain admin.", notVerified: "Not yet verified by an admin.",
    availableProduce: "Available produce", nothingListed: "Nothing listed at the moment",
  },
  how: {
    title: "How SeedChain works", lead: "There is no storage operator, logistics operator or reseller on the platform. Storage and delivery are real-world activities that the farmer records.",
    farmerRole: "Farmer", farmerText: "Registers, gets approved by an admin, records farms and crops, creates lots, prints the QR label, lists produce, fulfils orders (own delivery, pickup, or a courier they arrange) and records storage.",
    customerRole: "Customer", customerText: "Registers, browses listed produce, orders directly from the farmer, scans QR labels, confirms receipt and leaves feedback.",
    adminRole: "Admin", adminText: "Approves and governs farmers, can revoke compromised QR labels, and monitors lots, inventory, orders, scans, alerts and external data sources.",
    qrHeading: "What the QR contains", qrBody1: "Only a link such as", qrBody2: ". No quantities, contact details or status are inside the code. Opening it asks the server for the current record of that exact lot. If the label is lost or copied, an admin can revoke it; the lot keeps its identity and history and gets a new label.",
    claimHeading: "What we do and do not claim", claim1: "The trace is", claimBold: "database-backed", claim2: ": entries are recorded by farmers and the platform, are append-only and show who recorded them. Market prices and weather come from external sources and are labelled with their source and retrieval time. Risk ratings come from transparent rules, not machine learning. This is not a blockchain and not an independent certification.",
  },
  scanPage: {
    eyebrow: "Trace", h1a: "Scan it.", h1b: "Know where it came from.", lead: "Point your camera at the label on the produce. We look the lot up live. Nothing is cached.",
    startingCamera: "Starting camera…", toggleFlash: "Toggle flashlight", checking: "Checking with SeedChain…", retry: "Retry", scanAgain: "Scan again", openCamera: "Open camera",
    normalCamera: "You can also scan with your phone's normal camera app. It opens the same page.", stopCamera: "Stop camera", orPaste: "Or paste the QR link", verify: "Verify",
    notSeedchain: "Not a SeedChain QR", otherSite: "This QR points to a different website, so we did not open it.", noLink: "This QR does not contain a SeedChain trace link.",
    cameraUnavailable: "Camera not available", noCameraBrowser: "This browser cannot access a camera.", needHttps: "Camera access needs a secure (HTTPS) connection. Open SeedChain over HTTPS, or use your phone's normal camera app to scan the QR.",
    permDenied: "Camera permission denied", noCameraFound: "No camera found", couldNotStart: "Could not start the camera", allowCamera: "Allow camera access in your browser settings and try again, or paste the QR link below.",
    deviceNoCamera: "This device has no camera. Paste the QR link below instead.", notLink: "Not a SeedChain QR link", pasteFull: "Paste the full link printed under the QR, e.g. https://…/trace/…",
  },
  traceExtra: { gradeDetail: "Grade {{g}}", system: "System" },
};
export default pub;
export type Pub = typeof pub;
