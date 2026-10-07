import { Navbar } from "@/components/layout/navbar";
import { Card } from "@/components/app/common";

const rows = [
  ["Farmer", "Registers, gets approved by an admin, records farms and crops, creates lots, prints the QR label, lists produce, fulfils orders (own delivery, pickup, or a courier they arrange) and records storage."],
  ["Customer", "Registers, browses listed produce, orders directly from the farmer, scans QR labels, confirms receipt and leaves feedback."],
  ["Admin", "Approves and governs farmers, can revoke compromised QR labels, and monitors lots, inventory, orders, scans, alerts and external data sources."],
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-28">
        <h1 className="text-3xl font-medium">How SeedChain works</h1>
        <p className="mt-2 text-ink/60">There is no storage operator, logistics operator or reseller on the platform. Storage and delivery are real-world activities that the farmer records.</p>
        <div className="mt-6 space-y-3">{rows.map(([r, t]) => <Card key={r} className="p-5"><div className="font-medium">{r}</div><p className="mt-1 text-sm text-ink/65">{t}</p></Card>)}</div>
        <h2 className="mb-2 mt-10 text-xl font-medium">What the QR contains</h2>
        <Card className="p-5 text-sm text-ink/70">
          Only a link such as <code className="rounded bg-glass px-1">https://…/trace/&lt;random token&gt;</code>. No quantities, contact details or status are inside the code. Opening it asks the server for the current record of that exact lot. If the label is lost or copied, an admin can revoke it; the lot keeps its identity and history and gets a new label.
        </Card>
        <h2 className="mb-2 mt-10 text-xl font-medium">What we do and do not claim</h2>
        <Card className="p-5 text-sm text-ink/70">
          The trace is <b>database-backed</b>: entries are recorded by farmers and the platform, are append-only and show who recorded them. Market prices and weather come from external sources and are labelled with their source and retrieval time. Risk ratings come from transparent rules, not machine learning. This is not a blockchain and not an independent certification.
        </Card>
      </div>
    </div>
  );
}
