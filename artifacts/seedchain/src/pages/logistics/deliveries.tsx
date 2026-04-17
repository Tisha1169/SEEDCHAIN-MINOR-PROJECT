import { useState } from "react";
import { motion } from "framer-motion";
import { deliveryJobs } from "@/lib/supply-chain";
import { Truck, CheckCircle2, Package, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const statusBadge: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]" },
  accepted: { bg: "bg-purple-50", text: "text-purple-600" },
  "picked-up": { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  "in-transit": { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  delivered: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]" },
};

export default function LogisticsDeliveries() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState(deliveryJobs);

  const accept = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "accepted" as const } : j));
    toast({ title: "Delivery Accepted!", description: "You can now pick up the shipment." });
  };

  const pickup = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "in-transit" as const } : j));
    toast({ title: "Shipment Picked Up!", description: "Update your location during transit." });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Delivery Jobs</h2>
        <p className="text-sm text-[#1A1A1A]/40">Accept and manage delivery assignments</p>
      </div>

      <div className="space-y-4">
        {jobs.map((d, i) => {
          const sb = statusBadge[d.status] || statusBadge.pending;
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${d.status === "delivered" ? "bg-[#3FAF5E]/10" : "bg-[#F59E0B]/10"}`}>
                    {d.status === "delivered" ? <CheckCircle2 className="w-6 h-6 text-[#3FAF5E]" /> : <Truck className="w-6 h-6 text-[#F59E0B]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[#1A1A1A]">{d.trackingId}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${sb.bg} ${sb.text}`}>{d.status.replace("-", " ")}</span>
                    </div>
                    <div className="text-xs text-[#1A1A1A]/40">{d.batchId} · {d.driverName} · {d.vehicleNo}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]/40">
                    <MapPin className="w-3.5 h-3.5" />
                    {d.pickup.split(",")[0]} → {d.dropoff.split(",")[0]}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]/40">
                    <Clock className="w-3.5 h-3.5" /> {d.scheduledDate}
                  </div>
                  {d.status === "pending" && (
                    <button onClick={() => accept(d.id)} className="h-8 px-4 rounded-xl bg-[#3B82F6] text-white text-xs font-medium hover:bg-[#3B82F6]/90 transition-colors">
                      Accept
                    </button>
                  )}
                  {d.status === "accepted" && (
                    <button onClick={() => pickup(d.id)} className="h-8 px-4 rounded-xl bg-[#F59E0B] text-white text-xs font-medium hover:bg-[#F59E0B]/90 transition-colors">
                      Confirm Pickup
                    </button>
                  )}
                  {(d.status === "in-transit" || d.status === "picked-up") && (
                    <Link href="/logistics/update-location">
                      <button className="h-8 px-4 rounded-xl bg-[#3FAF5E]/10 text-[#3FAF5E] text-xs font-medium hover:bg-[#3FAF5E]/20 transition-colors">
                        Update Location
                      </button>
                    </Link>
                  )}
                  <Link href={`/tracking/${d.trackingId}`}>
                    <button className="h-8 px-4 rounded-xl bg-gray-100 text-[#1A1A1A]/60 text-xs font-medium hover:bg-gray-200 transition-colors">
                      Track
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
