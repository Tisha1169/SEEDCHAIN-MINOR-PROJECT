import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { MapPin, Ruler, Sprout } from "lucide-react";

export default function FarmerSetup() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    farmName: "", farmLocation: "", farmSize: "",
    variety: "", plantingDate: "", expectedHarvest: "",
  });

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleComplete = async () => {
    await supabase.from("farms").insert({
      farmer_id: user?.id,
      farm_name: form.farmName,
      location: form.farmLocation,
      farm_size: form.farmSize,
    });
    if (form.variety) {
      await supabase.from("seed_batches").insert({
        farmer_id: user?.id,
        variety: form.variety,
        planting_date: form.plantingDate,
        expected_harvest: form.expectedHarvest,
      });
    }
  };

  const steps = [
    {
      title: "Farm Profile",
      description: "Tell us about your farm",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#3FAF5E]/5 mb-4">
            <Sprout className="w-8 h-8 text-[#3FAF5E]" />
            <p className="text-sm text-muted-foreground">Set up your farm profile to start tracking your potato seed production.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Farm Name</label>
            <Input value={form.farmName} onChange={(e) => update("farmName", e.target.value)} placeholder="e.g. Green Valley Farm" className="h-12 rounded-xl bg-muted/50 border-0" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block flex items-center gap-1"><MapPin className="w-4 h-4" /> Farm Location</label>
            <Input value={form.farmLocation} onChange={(e) => update("farmLocation", e.target.value)} placeholder="e.g. Punjab, India" className="h-12 rounded-xl bg-muted/50 border-0" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block flex items-center gap-1"><Ruler className="w-4 h-4" /> Farm Size (acres)</label>
            <Input value={form.farmSize} onChange={(e) => update("farmSize", e.target.value)} placeholder="e.g. 25" type="number" className="h-12 rounded-xl bg-muted/50 border-0" />
          </div>
        </div>
      ),
    },
    {
      title: "Crop Details",
      description: "What are you growing?",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Potato Variety</label>
            <select value={form.variety} onChange={(e) => update("variety", e.target.value)} className="w-full h-12 rounded-xl bg-muted/50 border-0 px-3 text-sm">
              <option value="">Select variety</option>
              <option value="Kufri Jyoti">Kufri Jyoti</option>
              <option value="Kufri Pukhraj">Kufri Pukhraj</option>
              <option value="Kufri Badshah">Kufri Badshah</option>
              <option value="Kufri Chipsona">Kufri Chipsona</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Planting Date</label>
            <Input value={form.plantingDate} onChange={(e) => update("plantingDate", e.target.value)} type="date" className="h-12 rounded-xl bg-muted/50 border-0" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Expected Harvest Month</label>
            <Input value={form.expectedHarvest} onChange={(e) => update("expectedHarvest", e.target.value)} type="month" className="h-12 rounded-xl bg-muted/50 border-0" />
          </div>
        </div>
      ),
    },
    {
      title: "Confirm Setup",
      description: "Review your farm profile",
      content: (
        <div className="space-y-3">
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Farm Name</span><span className="text-sm font-semibold">{form.farmName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Location</span><span className="text-sm font-semibold">{form.farmLocation || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Size</span><span className="text-sm font-semibold">{form.farmSize ? `${form.farmSize} acres` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Variety</span><span className="text-sm font-semibold">{form.variety || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Planting Date</span><span className="text-sm font-semibold">{form.plantingDate || "—"}</span></div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <StepWizard
      title="Farmer Setup"
      steps={steps}
      onComplete={handleComplete}
      completedTitle="Farm Profile Created!"
      completedMessage="Your farm profile has been successfully created. Start managing your crops."
      completedAction={{ label: "Go To Dashboard", href: "/farmer" }}
    />
  );
}
