import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

export default function StorageSetup() {
  const { user } = useAuth();
  const [form, setForm] = useState({ facilityName: "", location: "", totalCapacity: "", storageSlots: "" });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <StepWizard
      title="Storage Facility Setup"
      steps={[
        { title: "Facility Information", description: "Tell us about your storage facility", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Facility Name</label>
              <Input value={form.facilityName} onChange={(e) => update("facilityName", e.target.value)} placeholder="e.g. ColdStore Punjab" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Amritsar, Punjab" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Capacity Details", description: "Storage capacity information", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Total Capacity (tons)</label>
              <Input value={form.totalCapacity} onChange={(e) => update("totalCapacity", e.target.value)} type="number" placeholder="e.g. 500" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Storage Slots</label>
              <Input value={form.storageSlots} onChange={(e) => update("storageSlots", e.target.value)} type="number" placeholder="e.g. 20" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Confirm Setup", description: "Review facility details", content: (
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Facility</span><span className="text-sm font-semibold">{form.facilityName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Location</span><span className="text-sm font-semibold">{form.location || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Capacity</span><span className="text-sm font-semibold">{form.totalCapacity ? `${form.totalCapacity} tons` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Slots</span><span className="text-sm font-semibold">{form.storageSlots || "—"}</span></div>
          </div>
        )},
      ]}
      onComplete={async () => {}}
      completedTitle="Facility Registered!"
      completedMessage="Your cold storage facility is now part of the SeedChain network."
      completedAction={{ label: "Go To Dashboard", href: "/storage" }}
    />
  );
}
