import { motion } from "framer-motion";
import { dummyHarvests } from "@/lib/supply-chain";
import { Package } from "lucide-react";

export default function FarmerHarvests() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Harvest Records</h2>
        <p className="text-sm text-[#1A1A1A]/40">All recorded harvests linked to your batches</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dummyHarvests.map((h, i) => (
          <motion.div key={h.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3 }}
            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#3FAF5E]/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#3FAF5E]" />
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${h.grade === "A" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : h.grade === "B" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-gray-100 text-gray-600"}`}>
                Grade {h.grade}
              </span>
            </div>
            <div className="text-xs font-mono text-[#1A1A1A]/35 mb-0.5">{h.batchId}</div>
            <div className="text-lg font-bold text-[#1A1A1A] mb-3">{h.variety}</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Quantity</span><span className="font-semibold text-[#1A1A1A]">{h.quantityKg.toLocaleString()} kg</span></div>
              <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Harvest Date</span><span className="font-medium">{h.harvestDate}</span></div>
              <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Location</span><span className="font-medium">{h.location}</span></div>
            </div>
            {h.notes && <div className="mt-3 pt-3 border-t border-[#E8E6E1]/40 text-[10px] text-[#1A1A1A]/40 italic">{h.notes}</div>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
