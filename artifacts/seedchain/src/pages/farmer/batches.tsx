import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dummyBatches, batchQRData } from "@/lib/supply-chain";

const statusColor: Record<string, { bg: string; text: string }> = {
  planted: { bg: "bg-blue-50", text: "text-blue-600" },
  growing: { bg: "bg-emerald-50", text: "text-emerald-600" },
  harvested: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]" },
  "in-storage": { bg: "bg-purple-50", text: "text-purple-600" },
  "in-transit": { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  delivered: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]" },
  sold: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function FarmerBatches() {
  const [search, setSearch] = useState("");
  const filtered = dummyBatches.filter(
    (b) => b.batchId.toLowerCase().includes(search.toLowerCase()) || b.variety.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Seed Batches</h2>
          <p className="text-sm text-[#1A1A1A]/40">All registered crop batches with digital identities</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
          <Input placeholder="Search batches..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl border-[#E8E6E1] bg-white h-11" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((b, i) => {
          const sc = statusColor[b.status] || statusColor.planted;
          return (
            <motion.div key={b.batchId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="bg-white rounded-[24px] border border-[#E8E6E1]/60 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-[#1A1A1A]/35">{b.batchId}</span>
                  <h3 className="text-base font-bold text-[#1A1A1A]">{b.variety}</h3>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold capitalize ${sc.bg} ${sc.text}`}>{b.status.replace("-", " ")}</span>
              </div>
              <div className="flex items-center justify-center bg-[#F7F7F7] rounded-2xl p-4 mb-3">
                <QRCodeSVG value={batchQRData(b)} size={90} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Quantity</span><span className="font-medium">{b.quantity}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Harvest Date</span><span className="font-medium">{b.harvestDate}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Grade</span><span className={`font-semibold ${b.grade === "A" ? "text-[#3FAF5E]" : "text-[#F59E0B]"}`}>Grade {b.grade}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">RFID</span><span className="font-mono text-[10px] text-[#1A1A1A]/50">{b.rfidTag}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Origin</span><span className="font-medium">{b.origin}</span></div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
