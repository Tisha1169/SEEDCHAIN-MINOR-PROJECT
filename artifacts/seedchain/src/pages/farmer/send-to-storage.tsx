import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Warehouse } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { dummyBatches, generateTrackingId } from "@/lib/supply-chain";

const storages = [
  { id: "ST-001", name: "CoolStore Amritsar", location: "Amritsar, Punjab", capacity: "10,000 kg", temp: "3-5°C" },
  { id: "ST-002", name: "FreshVault Agra", location: "Agra, UP", capacity: "8,000 kg", temp: "2-4°C" },
  { id: "ST-003", name: "ColdChain Deesa", location: "Deesa, Gujarat", capacity: "6,000 kg", temp: "3-6°C" },
];

export default function FarmerSendToStorage() {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [trackingId, setTrackingId] = useState("");
  const [form, setForm] = useState({ batchId: "", storageId: "", scheduledDate: "2026-04-17" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tid = generateTrackingId();
    setTrackingId(tid);
    toast({ title: "Shipment Created!", description: `Tracking ID: ${tid}` });
    setStep("success");
  };

  if (step === "success") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
      <div className="bg-white rounded-[28px] p-8 shadow-sm border border-[#E8E6E1]/60 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#3FAF5E]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#3FAF5E]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Shipment Created!</h2>
        <p className="text-[#1A1A1A]/40 text-sm mb-6">Your batch is en route to cold storage.</p>
        <div className="bg-[#F7F7F7] rounded-2xl p-4 mb-6">
          <div className="text-xs text-[#1A1A1A]/40 mb-1">Tracking ID</div>
          <div className="text-xl font-bold font-mono text-[#1A1A1A]">{trackingId}</div>
        </div>
        <div className="flex gap-3">
          <Link href={`/tracking/${trackingId}`} className="flex-1">
            <button className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-medium hover:bg-[#3FAF5E]/90 transition-colors">
              Track Shipment
            </button>
          </Link>
          <button onClick={() => setStep("form")} className="flex-1 h-12 rounded-2xl border border-[#E8E6E1] text-[#1A1A1A] font-medium hover:bg-[#F7F7F7] transition-colors">
            New Shipment
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Send to Storage</h2>
        <p className="text-sm text-[#1A1A1A]/40">Ship your harvest batch to cold storage facility</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Batch to Ship *</label>
          <select required value={form.batchId} onChange={e => setForm(p => ({ ...p, batchId: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]">
            <option value="">Select harvested batch</option>
            {dummyBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} — {b.variety} ({b.quantity})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-2 block">Select Storage Facility *</label>
          <div className="space-y-2">
            {storages.map(s => (
              <label key={s.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${form.storageId === s.id ? "border-[#3FAF5E] bg-[#3FAF5E]/5" : "border-[#E8E6E1] hover:border-[#3FAF5E]/40"}`}>
                <input type="radio" name="storage" value={s.id} checked={form.storageId === s.id} onChange={e => setForm(p => ({ ...p, storageId: e.target.value }))} className="accent-[#3FAF5E]" />
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center shrink-0">
                  <Warehouse className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1A1A1A]">{s.name}</div>
                  <div className="text-xs text-[#1A1A1A]/40">{s.location} · {s.temp}</div>
                </div>
                <span className="text-xs text-[#3FAF5E] font-medium">{s.capacity}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Scheduled Delivery Date</label>
          <input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
        </div>
        <button type="submit" disabled={!form.batchId || !form.storageId}
          className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 disabled:opacity-40 transition-colors shadow-sm">
          Create Shipment & Get Tracking ID
        </button>
      </motion.form>
    </div>
  );
}
