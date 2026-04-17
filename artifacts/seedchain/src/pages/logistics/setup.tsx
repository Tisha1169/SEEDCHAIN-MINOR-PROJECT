import { useState } from "react";
import { motion } from "framer-motion";
import { Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function LogisticsSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ companyName: "", driverName: "", phone: "", vehicleNo: "", vehicleType: "Refrigerated Truck" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Profile Created!", description: "You can now accept delivery jobs." });
    setLocation("/logistics");
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Setup Logistics Profile</h2>
        <p className="text-sm text-[#1A1A1A]/40">Register your transport company and vehicle</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Company Name *</label>
          <input required placeholder="e.g. FastTrack Logistics" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Driver Name *</label>
            <input required placeholder="Full name" value={form.driverName} onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Phone</label>
            <input placeholder="+91 XXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Vehicle No *</label>
            <input required placeholder="e.g. PB-10-AB-1234" value={form.vehicleNo} onChange={e => setForm(p => ({ ...p, vehicleNo: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Vehicle Type</label>
            <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]">
              <option>Refrigerated Truck</option><option>Open Truck</option><option>Container</option><option>Mini Truck</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full h-12 rounded-2xl bg-[#F59E0B] text-white font-semibold hover:bg-[#F59E0B]/90 transition-colors shadow-sm">
          Save Profile & Continue
        </button>
      </motion.form>
    </div>
  );
}
