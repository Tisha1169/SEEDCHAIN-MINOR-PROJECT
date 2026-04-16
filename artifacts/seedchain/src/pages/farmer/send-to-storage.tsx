import { useState } from "react";
import { Input } from "@/components/ui/input";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Warehouse } from "lucide-react";

const facilities = [
  { id: "s1", name: "ColdStore Punjab", location: "Amritsar, Punjab", capacity: "85% full" },
  { id: "s2", name: "FreshKeep Delhi", location: "New Delhi", capacity: "60% full" },
  { id: "s3", name: "AgroStore Gujarat", location: "Ahmedabad, Gujarat", capacity: "40% full" },
];

export default function SendToStorage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ facility: "", quantity: "", batchId: "" });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <StepWizard
      title="Send To Storage"
      steps={[
        { title: "Select Storage Facility", description: "Choose where to store your harvest", content: (
          <div className="space-y-3">
            {facilities.map((f) => (
              <button key={f.id} type="button" onClick={() => update("facility", f.id)}
                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${form.facility === f.id ? "bg-[#3FAF5E]/10 border-2 border-[#3FAF5E] shadow-md" : "bg-muted/50 border-2 border-transparent hover:bg-muted"}`}>
                <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center shrink-0">
                  <Warehouse className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1A1A1A]">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.location} · {f.capacity}</div>
                </div>
              </button>
            ))}
          </div>
        )},
        { title: "Shipment Details", description: "Enter quantity to send", content: (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Batch to Send</label>
              <select value={form.batchId} onChange={(e) => update("batchId", e.target.value)} className="w-full h-12 rounded-xl bg-muted/50 border-0 px-3 text-sm">
                <option value="">Select batch</option>
                <option value="b1">Kufri Jyoti — 2,500 kg (Grade A)</option>
                <option value="b2">Kufri Pukhraj — 1,800 kg (Grade A)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Quantity (kg)</label>
              <Input value={form.quantity} onChange={(e) => update("quantity", e.target.value)} type="number" placeholder="e.g. 1000" className="h-12 rounded-xl bg-muted/50 border-0" />
            </div>
          </div>
        )},
        { title: "Confirm Shipment", description: "Review before sending", content: (
          <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Storage Facility</span><span className="text-sm font-semibold">{facilities.find((f) => f.id === form.facility)?.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Quantity</span><span className="text-sm font-semibold">{form.quantity ? `${form.quantity} kg` : "—"}</span></div>
          </div>
        )},
      ]}
      onComplete={async () => {
        await supabase.from("storage_records").insert({ batch_id: form.batchId, storage_id: form.facility, quantity: Number(form.quantity) });
      }}
      completedTitle="Shipment Created!"
      completedMessage="Your harvest is on its way to cold storage."
      completedAction={{ label: "Track Shipment", href: "/farmer/shipments" }}
    />
  );
}
