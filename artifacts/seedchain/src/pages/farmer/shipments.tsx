import { motion } from "framer-motion";
import { allShipments } from "@/lib/supply-chain";
import { Link } from "wouter";
import { Truck, MapPin, CheckCircle2, Clock } from "lucide-react";

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  created: { bg: "bg-gray-100", text: "text-gray-600", label: "Created" },
  harvested: { bg: "bg-blue-50", text: "text-blue-600", label: "Harvested" },
  stored: { bg: "bg-purple-50", text: "text-purple-600", label: "Stored" },
  "in-transit": { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", label: "In Transit" },
  delivered: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]", label: "Delivered" },
};

export default function FarmerShipments() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Shipments</h2>
        <p className="text-sm text-[#1A1A1A]/40">Track all your batch shipments in real-time</p>
      </div>
      <div className="space-y-4">
        {allShipments.map((s, i) => {
          const sb = statusBadge[s.status] || statusBadge.created;
          return (
            <motion.div key={s.trackingId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.status === "in-transit" ? "bg-[#F59E0B]/10" : s.status === "delivered" ? "bg-[#3FAF5E]/10" : "bg-blue-50"}`}>
                    <Truck className={`w-6 h-6 ${s.status === "in-transit" ? "text-[#F59E0B]" : s.status === "delivered" ? "text-[#3FAF5E]" : "text-blue-500"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-bold text-[#1A1A1A]">{s.trackingId}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sb.bg} ${sb.text}`}>{sb.label}</span>
                    </div>
                    <div className="text-xs text-[#1A1A1A]/40">{s.batch.batchId} · {s.batch.variety} · {s.batch.quantity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-1.5 text-[#1A1A1A]/40">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{s.origin.name.split(",")[0]}</span>
                    <span>→</span>
                    <span>{s.destination.name.split(",")[0]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#1A1A1A]/40">
                    <Clock className="w-3.5 h-3.5" />
                    <span>ETA {s.estimatedDelivery}</span>
                  </div>
                  <Link href={`/tracking/${s.trackingId}`}>
                    <button className="h-8 px-4 rounded-xl bg-[#3FAF5E]/10 text-[#3FAF5E] text-xs font-medium hover:bg-[#3FAF5E]/20 transition-colors">
                      Track
                    </button>
                  </Link>
                </div>
              </div>
              {/* Mini timeline */}
              <div className="mt-4 flex items-center gap-0">
                {s.events.map((ev, j) => (
                  <div key={ev.id} className="flex items-center flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${ev.completed ? "bg-[#3FAF5E] text-white" : ev.current ? "bg-[#F59E0B] text-white ring-2 ring-[#F59E0B]/30" : "bg-[#E8E6E1] text-[#1A1A1A]/30"}`}>
                      {ev.completed ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    {j < s.events.length - 1 && <div className={`flex-1 h-[2px] ${ev.completed ? "bg-[#3FAF5E]" : "bg-[#E8E6E1]"}`} />}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
