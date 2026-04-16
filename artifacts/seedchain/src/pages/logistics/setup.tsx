import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";

export default function LogisticsSetup() {
  const [form, setForm] = useState({ companyName: "", location: "", vehicleNumber: "", capacity: "" });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <StepWizard
      title="Logistics Partner Setup"
      steps={[
        { title: "Company Information", description: "Tell us about your logistics company", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Company Name</label>
              <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="e.g. FastTrack Logistics" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Chennai, Tamil Nadu" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Vehicle Information", description: "Details about your fleet", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Vehicle Number</label>
              <Input value={form.vehicleNumber} onChange={(e) => update("vehicleNumber", e.target.value)} placeholder="e.g. TN-01-AB-1234" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Capacity (tons)</label>
              <Input value={form.capacity} onChange={(e) => update("capacity", e.target.value)} type="number" placeholder="e.g. 10" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Confirm Setup", content: (
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Company</span><span className="text-sm font-semibold">{form.companyName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Location</span><span className="text-sm font-semibold">{form.location || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Vehicle</span><span className="text-sm font-semibold">{form.vehicleNumber || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Capacity</span><span className="text-sm font-semibold">{form.capacity ? `${form.capacity} tons` : "—"}</span></div>
          </div>
        )},
      ]}
      onComplete={async () => {}}
      completedTitle="Setup Complete!"
      completedMessage="Your logistics company is now registered with SeedChain."
      completedAction={{ label: "Go To Dashboard", href: "/logistics" }}
    />
  );
}
