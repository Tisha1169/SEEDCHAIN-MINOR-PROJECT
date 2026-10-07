const landing = {
  landing: {
    hero: {
      eyebrow: "Digital identity for every harvest", line1: "Every harvest", line2: "has a story.", lead: "SeedChain gives every agricultural lot a digital identity, from farm to customer.",
      explore: "Explore SeedChain", scan: "Scan a product", tag1: "Traceable", tag2: "Transparent", tag3: "Direct", route1: "Farm → Lot → QR", route2: "→ Customer", scrollHint: "Scroll to explore",
    },
    frame: {
      alt: "Harvested potatoes", lotChip: "{{code}} · VERIFIED", lotFallback: "LOT VERIFIED", lot: "Lot", qr: "QR", active: "ACTIVE", traceability: "Traceability", route: "Route", routeValue: "FARM → CUSTOMER",
      harvest: "Harvest", tagline: "From soil to table, on the record.", farmers: "Verified farmers", lotsOnSale: "Lots on sale", scans: "Verified scans", coverage: "Traceability coverage",
      unavailable: "Live figures are temporarily unavailable.", live: "Figures are live from the SeedChain database.",
    },
    identity: {
      alt: "Potatoes from a SeedChain lot", potato: "POTATO", eyebrow: "Digital identity", line1: "One lot.", line2: "One identity.",
      body: "Every SeedChain lot receives a persistent digital identity that stays connected to its live traceability history.", passport: "Lot passport", qrActive: "QR ACTIVE", awaiting: "AWAITING FIRST LOT",
      lot: "Lot", farm: "Farm", harvest: "Harvest", status: "Status", verified: "VERIFIED", registered: "REGISTERED", empty: "This card fills with a real lot as soon as a farmer lists one. Nothing here is sample data.",
    },
    qr: {
      eyebrow: "QR identity", line1: "Scan it.", line2: "Know where it came from.", c1: "Farm verified", c2: "Harvest recorded", c3: "Quality recorded", c4: "Lot verified", c5: "Direct farmer supply",
      ticks: "Ticks light up from a real lot's records once one is listed.", aria: "Scannable SeedChain QR code", tryScanner: "TRY THE SCANNER", labelFooter: "Scan to verify traceability", verified: "SEEDCHAIN VERIFIED",
      liveRecord: "LOT · LIVE RECORD", opens: "Opens the live public record", s1: "Harvest recorded", s2: "Quality recorded", s3: "Listed by farmer", fromDb: "LIVE FROM DATABASE",
      openTrace: "Open this lot's live trace page", openScanner: "Open the scanner",
    },
    journey: {
      eyebrow: "Traceability journey", line1: "Every step,", line2: "on the record.", liveFrom: "Live from {{code}}. Steps that have not happened yet stay dark.", generic: "How every lot is recorded. Real dates appear once a lot is listed.",
      farm: "Farm", harvest: "Harvest", quality: "Quality", qr: "QR", order: "Order", delivery: "Delivery", customer: "Customer",
    },
    direct: {
      eyebrow: "No middleman", line1: "From the farmer.", line2: "Directly to you.", farmer: "Farmer", farmerText: "Creates the lot, prints the QR, sets the price and fulfils every order directly.",
      seedchain: "SeedChain", seedchainText: "One permanent identity per lot, live traceability and an append-only record.", customer: "Customer", customerText: "Scans, verifies, orders straight from the farmer and confirms receipt.",
    },
    passport: {
      alt: "Potatoes in the field above a sunrise valley", verifiedFarmer: "Verified farmer", profileFallback: "Farm profiles appear when a farmer lists a lot", crops: "Crops listed here",
      activeLots: "Active lots", traceability: "Traceability", rating: "Rating", noRatings: "No customer ratings yet", eyebrow: "Farmer digital passport", line1: "Trust begins", line2: "at the farm.",
      body: "Every farmer is reviewed by an admin before they can create a lot. Their public profile, active lots and customer ratings travel with every QR they print.", join: "Join as a farmer", seeProduce: "See farmers' produce",
    },
    intel: {
      eyebrow: "Intelligence", line1: "The whole picture,", line2: "in one place.", lead: "Live from the platform's database and from labelled external sources. If a source has no data, we show a dash, never a made-up number.",
      market: "Market", weather: "Weather", inventory: "Inventory", demand: "Demand", traceability: "Traceability", risk: "Risk", perKg: "₹{{price}}/kg", kg: "{{n}} kg",
      marketSub: "{{market}}, {{state}} · {{date}} · {{source}}", noMarket: "No market feed connected yet", weatherSub: "At the featured farm · Open-Meteo · {{ago}}", noWeather: "Appears when a farm has GPS",
      invSub: "Available across listed lots", demandSub: "Orders placed in the last 30 days", traceSub: "{{n}} harvested lots counted", riskSub: "Lots at elevated risk (transparent rules, not AI)", coverage: "Traceability coverage",
    },
    cust: {
      eyebrow: "For customers", line1: "Discover.", line2: "Verify. Buy.", s1t: "Discover", s1d: "Browse produce listed directly by verified farmers.", s2t: "Verify", s2d: "Scan the QR and read the lot's live history.", s3t: "Buy", s3d: "Order from the farmer and confirm when it arrives.",
      verifiedFarmer: "VERIFIED FARMER", registered: "REGISTERED", perUnit: "per {{unit}}", from: "From", fromVerified: "Verified {{state}} farmer", fromPlain: "{{state}} farmer", harvested: "Harvested", traceability: "Traceability", grade: "Grade", gradeValue: "Grade {{g}}",
      viewJourney: "View journey", buyNow: "Buy now", passport: "Product passport", identity: "Product identity", lot: "Lot", origin: "Origin", harvest: "Harvest", quality: "Quality", status: "Status", gradeCaps: "GRADE {{g}}", history: "History", historyEmpty: "The history of the first listed lot appears here.",
    },
    closing: {
      line1: "Know what", line2: "you eat.", explore: "Explore SeedChain", create: "Create account", footerNav: "Footer", marketplace: "Marketplace", scan: "Scan a QR", how: "How it works", farmers: "For farmers", signIn: "Sign in",
      disclaimer: "Database-backed, append-only traceability recorded by farmers and the platform. Market prices and weather are external information shown with their source and retrieval time. Risk ratings come from transparent rules, not machine learning.",
    },
  },
};
export default landing;
export type Landing = typeof landing;
