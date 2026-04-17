import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function BuyerSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ businessName: "", contactName: "", phone: "", location: "", type: "Wholesaler" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Profile Created!", description: "You can now browse the marketplace." });
    setLocation("/buyer");
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Setup Buyer Profile</h2>
        <p className="text-sm text-[#1A1A1A]/40">Tell us about your business</p>
      </div>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Business Name *</label>
          <input required placeholder="e.g. Green Mart Pvt Ltd" value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#8B5CF6]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Contact Name *</label>
            <input required placeholder="Full name" value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Phone</label>
            <input placeholder="+91 XXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Business Location *</label>
          <input required placeholder="City, State" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#8B5CF6]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Business Type</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#8B5CF6]">
            <option>Wholesaler</option><option>Retailer</option><option>Processor</option><option>Exporter</option>
          </select>
        </div>
        <button type="submit" className="w-full h-12 rounded-2xl bg-[#8B5CF6] text-white font-semibold hover:bg-[#8B5CF6]/90 transition-colors shadow-sm">
          Save Profile & Continue
        </button>
      </motion.form>
    </div>
  );
}
