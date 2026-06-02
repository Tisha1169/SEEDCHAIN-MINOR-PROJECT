import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { batchQRData } from "@/lib/supply-chain";
import { QRCodeSVG } from "qrcode.react";
import { Sprout, CheckCircle2 } from "lucide-react";
import { useCreateBatch, useListBatches } from "@lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const varieties = ["Kufri Jyoti", "Kufri Pukhraj", "Kufri Badshah", "Kufri Chipsona", "Kufri Sinduri", "Kufri Lauvkar"];

export default function FarmerRegisterCrop() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"form" | "success">("form");
  const [newBatch, setNewBatch] = useState<any>(null);
  const [form, setForm] = useState({ variety: "", plantingDate: "2026-04-16", expectedHarvest: "", area: "", location: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          variety: form.variety,
          plantingDate: form.plantingDate,
          expectedHarvestDate: form.expectedHarvest || "2026-07-16",
          quantityKg: parseInt(form.area) || 1000,
          notes: form.location || "Punjab, India",
        }),
      });

      if (!response.ok) throw new Error("Failed to create batch");
      const batch = await response.json();
      setNewBatch(batch);
      
      // Invalidate and refetch batches
      await queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      
      setStep("success");
      toast({ title: "Batch Registered!", description: `${batch.batchCode} created successfully` });
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setForm({ variety: "", plantingDate: "2026-04-16", expectedHarvest: "", area: "", location: "" });
        setStep("form");
      }, 3000);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to register batch", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success" && newBatch) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto">
      <div className="bg-white rounded-[28px] p-8 shadow-sm border border-[#E8E6E1]/60 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#3FAF5E]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#3FAF5E]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Batch Registered!</h2>
        <p className="text-[#1A1A1A]/40 text-sm mb-6">Your crop batch has a digital identity</p>
        <div className="bg-[#F7F7F7] rounded-2xl p-6 mb-6 flex flex-col items-center gap-4">
          <QRCodeSVG value={JSON.stringify({ batchCode: newBatch.batchCode, variety: newBatch.variety })} size={160} level="H" bgColor="#F7F7F7" fgColor="#1A1A1A" />
          <div className="text-xs text-[#1A1A1A]/40 text-center">
            <div className="font-mono font-semibold text-[#1A1A1A] text-base mb-1">{newBatch.batchCode}</div>
            <div>ID: {newBatch.id}</div>
          </div>
        </div>
        <div className="space-y-2 text-sm text-left mb-6">
          {[["Variety", newBatch.variety], ["Planting Date", newBatch.plantingDate], ["Expected Harvest", newBatch.expectedHarvestDate], ["Quantity", `${newBatch.quantityKg} kg`]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-[#E8E6E1]/40">
              <span className="text-[#1A1A1A]/40">{k}</span>
              <span className="font-medium text-[#1A1A1A]">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setStep("form"); setNewBatch(null); }} className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-medium hover:bg-[#3FAF5E]/90 transition-colors">
          Register Another Batch
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Register Crop Batch</h2>
        <p className="text-sm text-[#1A1A1A]/40">A QR code and RFID tag will be generated automatically</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Potato Variety *</label>
          <select required value={form.variety} onChange={e => setForm(p => ({ ...p, variety: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]">
            <option value="">Select variety</option>
            {varieties.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Planting Date</label>
            <input type="date" required value={form.plantingDate} onChange={e => setForm(p => ({ ...p, plantingDate: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Expected Harvest</label>
            <input type="date" value={form.expectedHarvest} onChange={e => setForm(p => ({ ...p, expectedHarvest: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Area (acres)</label>
            <input type="number" min="0.1" step="0.1" placeholder="e.g. 2.5" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Farm Location</label>
            <input type="text" placeholder="e.g. Amritsar, Punjab" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
        </div>
        <div className="bg-[#3FAF5E]/5 border border-[#3FAF5E]/20 rounded-2xl p-4 flex items-center gap-3">
          <Sprout className="w-5 h-5 text-[#3FAF5E] shrink-0" />
          <p className="text-xs text-[#1A1A1A]/60">A unique Batch ID, QR code, and RFID tag will be auto-generated upon registration.</p>
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 transition-colors shadow-sm disabled:opacity-50">
          {isSubmitting ? "Creating..." : "Register Batch & Generate QR"}
        </button>
      </motion.form>
    </div>
  );
}
