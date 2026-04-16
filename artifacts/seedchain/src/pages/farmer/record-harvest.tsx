import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

export default function RecordHarvest() {
  const { user } = useAuth();
  const [form, setForm] = useState({ cropField: "", harvestWeight: "", qualityGrade: "A" });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <StepWizard
      title="Record Harvest"
      steps={[
        { title: "Select Crop Field", description: "Choose which crop to harvest", content: (
          <div className="space-y-4">
            <select value={form.cropField} onChange={(e) => update("cropField", e.target.value)} className="w-full h-12 rounded-xl bg-muted/50 border-0 px-3 text-sm">
              <option value="">Select crop field</option>
              <option value="field-1">Kufri Jyoti — Field A (5 acres)</option>
              <option value="field-2">Kufri Pukhraj — Field B (3 acres)</option>
              <option value="field-3">Kufri Badshah — Field C (8 acres)</option>
            </select>
          </div>
        )},
        { title: "Harvest Details", description: "Enter harvest quantity and quality", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Harvest Weight (kg)</label>
              <Input value={form.harvestWeight} onChange={(e) => update("harvestWeight", e.target.value)} type="number" placeholder="e.g. 2500" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Quality Grade</label>
              <div className="grid grid-cols-3 gap-2">
                {["A", "B", "C"].map((g) => (
                  <button key={g} type="button" onClick={() => update("qualityGrade", g)}
                    className={`p-3 rounded-xl text-center font-bold transition-all ${form.qualityGrade === g ? "bg-[#3FAF5E] text-white shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                    Grade {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )},
        { title: "Confirm Harvest", description: "Review harvest record", content: (
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Crop Field</span><span className="text-sm font-semibold">{form.cropField || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Weight</span><span className="text-sm font-semibold">{form.harvestWeight ? `${form.harvestWeight} kg` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Grade</span><span className="text-sm font-semibold">Grade {form.qualityGrade}</span></div>
          </div>
        )},
      ]}
      onComplete={async () => {
        await supabase.from("harvests").insert({ batch_id: form.cropField, quantity: Number(form.harvestWeight), quality_grade: form.qualityGrade });
      }}
      completedTitle="Harvest Recorded!"
      completedMessage="Your harvest data has been saved successfully."
      completedAction={{ label: "Back to Dashboard", href: "/farmer" }}
    />
  );
}
