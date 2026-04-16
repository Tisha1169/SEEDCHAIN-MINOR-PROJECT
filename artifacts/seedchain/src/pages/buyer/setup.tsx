import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";

export default function BuyerSetup() {
  const [form, setForm] = useState({ businessName: "", location: "", preferredVariety: "", typicalQuantity: "" });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <StepWizard
      title="Buyer Onboarding"
      steps={[
        { title: "Business Information", description: "Tell us about your business", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Business Name</label>
              <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="e.g. Green Mart" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Bangalore, Karnataka" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Purchase Preferences", description: "What are you looking for?", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Preferred Variety</label>
              <select value={form.preferredVariety} onChange={(e) => update("preferredVariety", e.target.value)} className="w-full h-12 rounded-xl bg-muted/50 border-0 px-3 text-sm">
                <option value="">All varieties</option>
                <option value="Kufri Jyoti">Kufri Jyoti</option>
                <option value="Kufri Pukhraj">Kufri Pukhraj</option>
                <option value="Kufri Badshah">Kufri Badshah</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Typical Order Quantity (kg)</label>
              <Input value={form.typicalQuantity} onChange={(e) => update("typicalQuantity", e.target.value)} type="number" placeholder="e.g. 5000" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Confirm Setup", content: (
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Business</span><span className="text-sm font-semibold">{form.businessName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Location</span><span className="text-sm font-semibold">{form.location || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Preferred</span><span className="text-sm font-semibold">{form.preferredVariety || "All"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Quantity</span><span className="text-sm font-semibold">{form.typicalQuantity ? `${form.typicalQuantity} kg` : "—"}</span></div>
          </div>
        )},
      ]}
      onComplete={async () => {}}
      completedTitle="Account Ready!"
      completedMessage="You can now browse the marketplace and order certified potato seeds."
      completedAction={{ label: "Browse Marketplace", href: "/buyer/marketplace" }}
    />
  );
}
