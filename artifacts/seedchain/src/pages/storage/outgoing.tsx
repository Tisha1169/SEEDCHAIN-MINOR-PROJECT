import { useState } from "react";
import { motion } from "framer-motion";
import { storageInventory, generateTrackingId } from "@/lib/supply-chain";
import { CheckCircle2, Truck, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function StorageOutgoing() {
  const { toast } = useToast();
  const stored = storageInventory.filter(s => s.status === "stored");
  const [released, setReleased] = useState<string[]>([]);

  const handleRelease = (batchId: string) => {
    const tid = generateTrackingId();
    setReleased(prev => [...prev, batchId]);
    toast({ title: "Batch Released!", description: `${batchId} released for logistics pickup. Tracking: ${tid}` });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Outgoing Shipments</h2>
        <p className="text-sm text-[#1A1A1A]/40">Release batches from storage for logistics pickup</p>
      </div>

      <div className="space-y-4">
        {stored.map((s, i) => {
          const isReleased = released.includes(s.batchId);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`bg-white rounded-[24px] p-6 shadow-sm border transition-all ${isReleased ? "border-[#3FAF5E]/30 bg-[#3FAF5E]/[0.02]" : "border-[#E8E6E1]/60"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isReleased ? "bg-[#3FAF5E]/10" : "bg-[#3B82F6]/10"}`}>
                    {isReleased ? <CheckCircle2 className="w-6 h-6 text-[#3FAF5E]" /> : <Package className="w-6 h-6 text-[#3B82F6]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[#1A1A1A]">{s.batchId}</span>
                      <span className="text-xs font-semibold text-[#1A1A1A]/40">· {s.variety}</span>
                    </div>
                    <div className="text-xs text-[#1A1A1A]/40">{s.farmerName} · {s.quantityKg.toLocaleString()} kg · {s.chamber} · {s.temperatureC}°C</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isReleased ? (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Released
                    </span>
                  ) : (
                    <button onClick={() => handleRelease(s.batchId)}
                      className="h-10 px-5 rounded-xl bg-[#F59E0B] text-white text-xs font-medium hover:bg-[#F59E0B]/90 transition-colors flex items-center gap-2">
                      <Truck className="w-4 h-4" /> Release for Pickup
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {stored.length === 0 && (
          <div className="bg-white rounded-[24px] p-12 text-center shadow-sm border border-[#E8E6E1]/60">
            <Package className="w-12 h-12 text-[#1A1A1A]/15 mx-auto mb-3" />
            <p className="text-[#1A1A1A]/40">No batches currently stored</p>
          </div>
        )}
      </div>
    </div>
  );
}
