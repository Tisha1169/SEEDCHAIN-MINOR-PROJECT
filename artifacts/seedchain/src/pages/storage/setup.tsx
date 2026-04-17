import { useState } from "react";
import { motion } from "framer-motion";
import { Warehouse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function StorageSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ facilityName: "", location: "", capacity: "", tempRange: "2-6°C", chambers: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Facility Registered!", description: "You can now manage incoming shipments." });
    setLocation("/storage");
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Setup Storage Facility</h2>
        <p className="text-sm text-[#1A1A1A]/40">Register your cold storage facility details</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Facility Name *</label>
          <input required placeholder="e.g. CoolStore Amritsar" value={form.facilityName} onChange={e => setForm(p => ({ ...p, facilityName: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3B82F6]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Location *</label>
          <input required placeholder="Address" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3B82F6]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Capacity (kg)</label>
            <input type="number" placeholder="e.g. 16000" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3B82F6]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Chambers</label>
            <input type="number" placeholder="e.g. 6" value={form.chambers} onChange={e => setForm(p => ({ ...p, chambers: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3B82F6]" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Temperature Range</label>
          <select value={form.tempRange} onChange={e => setForm(p => ({ ...p, tempRange: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3B82F6]">
            <option>2-4°C</option><option>2-6°C</option><option>0-2°C</option><option>4-8°C</option>
          </select>
        </div>
        <button type="submit" className="w-full h-12 rounded-2xl bg-[#3B82F6] text-white font-semibold hover:bg-[#3B82F6]/90 transition-colors shadow-sm">
          Save Facility & Continue
        </button>
      </motion.form>
    </div>
  );
}
