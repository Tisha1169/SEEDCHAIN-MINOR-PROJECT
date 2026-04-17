import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, CheckCircle2, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deliveryJobs } from "@/lib/supply-chain";

export default function LogisticsUpdateLocation() {
  const { toast } = useToast();
  const activeJobs = deliveryJobs.filter(d => d.status === "in-transit" || d.status === "picked-up");
  const [form, setForm] = useState({ trackingId: activeJobs[0]?.trackingId || "", lat: "", lng: "", status: "in-transit" });
  const [updated, setUpdated] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Location Updated!", description: `${form.trackingId} — lat: ${form.lat}, lng: ${form.lng}` });
    setUpdated(true);
    setTimeout(() => setUpdated(false), 3000);
  };

  const handleGetLocation = () => {
    // Simulated location for demo
    setForm(p => ({ ...p, lat: "30.3165", lng: "76.3806" }));
    toast({ title: "Location Detected", description: "GPS coordinates retrieved" });
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Update Location</h2>
        <p className="text-sm text-[#1A1A1A]/40">Update your current position for active deliveries</p>
      </div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Active Delivery *</label>
          <select required value={form.trackingId} onChange={e => setForm(p => ({ ...p, trackingId: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]">
            {activeJobs.length === 0 && <option value="">No active deliveries</option>}
            {activeJobs.map(j => <option key={j.trackingId} value={j.trackingId}>{j.trackingId} — {j.batchId} ({j.pickup.split(",")[0]} → {j.dropoff.split(",")[0]})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Latitude *</label>
            <input type="number" step="any" required placeholder="e.g. 30.3165" value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Longitude *</label>
            <input type="number" step="any" required placeholder="e.g. 76.3806" value={form.lng} onChange={e => setForm(p => ({ ...p, lng: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]" />
          </div>
        </div>

        <button type="button" onClick={handleGetLocation}
          className="w-full h-11 rounded-2xl border border-[#E8E6E1] text-[#1A1A1A] text-sm font-medium hover:bg-[#F7F7F7] transition-colors flex items-center justify-center gap-2">
          <Navigation className="w-4 h-4 text-[#F59E0B]" /> Use Current GPS Location
        </button>

        <div>
          <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#F59E0B]">
            <option value="in-transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        <button type="submit" disabled={activeJobs.length === 0}
          className="w-full h-12 rounded-2xl bg-[#F59E0B] text-white font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-2">
          <MapPin className="w-4 h-4" /> Update Location
        </button>

        {updated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-[#3FAF5E]/10 border border-[#3FAF5E]/20 rounded-2xl p-3 flex items-center gap-2 text-sm text-[#3FAF5E]">
            <CheckCircle2 className="w-4 h-4" /> Location updated — tracking page refreshed
          </motion.div>
        )}
      </motion.form>
    </div>
  );
}
