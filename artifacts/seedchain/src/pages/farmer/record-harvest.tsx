import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dummyBatches } from "@/lib/supply-chain";

export default function FarmerRecordHarvest() {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({ batchId: "", quantityKg: "", grade: "A", harvestDate: "2026-04-16", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Harvest Recorded!", description: `${form.quantityKg} kg Grade ${form.grade} — supply chain event created` });
    setStep("success");
  };

  if (step === "success") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
      <div className="bg-white rounded-[28px] p-8 shadow-sm border border-[#E8E6E1]/60 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#3FAF5E]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#3FAF5E]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Harvest Recorded!</h2>
        <p className="text-[#1A1A1A]/50 text-sm mb-6">Supply chain event created. Storage operator has been notified.</p>
        <div className="bg-[#F7F7F7] rounded-2xl p-4 space-y-2 text-sm text-left mb-6">
          {[["Batch", form.batchId], ["Quantity", `${form.quantityKg} kg`], ["Grade", `Grade ${form.grade}`], ["Harvest Date", form.harvestDate]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-[#E8E6E1]/40 last:border-0">
              <span className="text-[#1A1A1A]/40">{k}</span><span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setStep("form")} className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-medium hover:bg-[#3FAF5E]/90 transition-colors">
          Record Another Harvest
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Record Harvest</h2>
        <p className="text-sm text-[#1A1A1A]/40">Log your harvest quantity, grade, and date</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Select Batch *</label>
          <select required value={form.batchId} onChange={e => setForm(p => ({ ...p, batchId: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]">
            <option value="">Choose batch</option>
            {dummyBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} — {b.variety}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Quantity (kg) *</label>
            <input type="number" required min="1" placeholder="e.g. 2500" value={form.quantityKg} onChange={e => setForm(p => ({ ...p, quantityKg: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Grade *</label>
            <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]">
              <option value="A">Grade A — Premium</option>
              <option value="B">Grade B — Standard</option>
              <option value="C">Grade C — Processing</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Harvest Date *</label>
          <input type="date" required value={form.harvestDate} onChange={e => setForm(p => ({ ...p, harvestDate: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Notes</label>
          <textarea rows={3} placeholder="Quality observations, pest damage, etc." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#3FAF5E]" />
        </div>
        <button type="submit" className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 transition-colors shadow-sm">
          Record Harvest
        </button>
      </motion.form>
    </div>
  );
}
