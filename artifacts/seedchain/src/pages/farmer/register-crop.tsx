import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

export default function RegisterCrop() {
  const { user } = useAuth();
  const [form, setForm] = useState({ variety: "", plantingDate: "", fieldSize: "" });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <StepWizard
      title="Register New Crop"
      steps={[
        { title: "Select Seed Batch", description: "Choose the potato variety", content: (
          <div className="space-y-4">
            <select value={form.variety} onChange={(e) => update("variety", e.target.value)} className="w-full h-12 rounded-xl bg-muted/50 border-0 px-3 text-sm">
              <option value="">Select variety</option>
              <option value="Kufri Jyoti">Kufri Jyoti</option>
              <option value="Kufri Pukhraj">Kufri Pukhraj</option>
              <option value="Kufri Badshah">Kufri Badshah</option>
              <option value="Kufri Chipsona">Kufri Chipsona</option>
            </select>
          </div>
        )},
        { title: "Planting Information", description: "Enter planting details", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Planting Date</label>
              <Input value={form.plantingDate} onChange={(e) => update("plantingDate", e.target.value)} type="date" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Field Size (acres)</label>
              <Input value={form.fieldSize} onChange={(e) => update("fieldSize", e.target.value)} type="number" placeholder="e.g. 5" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Confirm Registration", description: "Review crop details", content: (
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Variety</span><span className="text-sm font-semibold">{form.variety || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Planting Date</span><span className="text-sm font-semibold">{form.plantingDate || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Field Size</span><span className="text-sm font-semibold">{form.fieldSize ? `${form.fieldSize} acres` : "—"}</span></div>
          </div>
        )},
      ]}
      onComplete={async () => {
        await supabase.from("seed_batches").insert({ farmer_id: user?.id, variety: form.variety, planting_date: form.plantingDate });
      }}
      completedTitle="Crop Registered!"
      completedMessage="Your crop has been successfully registered in the system."
      completedAction={{ label: "Back to Dashboard", href: "/farmer" }}
    />
  );
}
