import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Phone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function FarmerSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ farmName: "", ownerName: "", phone: "", location: "", area: "", soilType: "Sandy Loam" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Farm Profile Created!", description: "You can now register crop batches." });
    setLocation("/farmer");
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Setup Farm Profile</h2>
        <p className="text-sm text-[#1A1A1A]/40">Tell us about your farm to get started</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Farm Name *</label>
          <input required placeholder="e.g. Singh Agro Farms" value={form.farmName} onChange={e => setForm(p => ({ ...p, farmName: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Owner Name *</label>
            <input required placeholder="Full name" value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Phone</label>
            <input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Farm Location *</label>
          <input required placeholder="Village, District, State" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Total Area (acres)</label>
            <input type="number" min="0.1" step="0.1" placeholder="e.g. 5" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Soil Type</label>
            <select value={form.soilType} onChange={e => setForm(p => ({ ...p, soilType: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]">
              <option>Sandy Loam</option>
              <option>Clay Loam</option>
              <option>Loamy</option>
              <option>Sandy</option>
              <option>Alluvial</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 transition-colors shadow-sm">
          Save Farm Profile & Continue
        </button>
      </motion.form>
    </div>
  );
}
