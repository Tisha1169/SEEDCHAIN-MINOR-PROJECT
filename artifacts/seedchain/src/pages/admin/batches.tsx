import { motion } from "framer-motion";
import { Package, Search, QrCode, Filter } from "lucide-react";
import { dummyBatches, batchQRData } from "@/lib/supply-chain";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

const statusColors: Record<string, string> = {
  harvested: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  stored: "bg-[#3B82F6]/10 text-[#3B82F6]",
  "in-transit": "bg-[#F59E0B]/10 text-[#F59E0B]",
  delivered: "bg-[#3FAF5E]/10 text-[#3FAF5E]",
};

export default function AdminBatches() {
  const [search, setSearch] = useState("");
  const [showQR, setShowQR] = useState<string | null>(null);
  const filtered = dummyBatches.filter(b =>
    b.batchId.toLowerCase().includes(search.toLowerCase()) || b.variety.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">All Batches</h2>
            <p className="text-xs text-[#1A1A1A]/40">{dummyBatches.length} batches tracked</p>
          </div>
          <div className="flex items-center bg-[#F7F7F7] rounded-xl px-3 py-2 gap-2 text-sm">
            <Search className="w-4 h-4 text-[#1A1A1A]/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batches…" className="bg-transparent outline-none w-44 text-sm placeholder:text-[#1A1A1A]/30" />
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.map((b, i) => (
            <motion.div key={b.batchId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="flex items-center gap-4 p-4 rounded-[18px] border border-[#E8E6E1]/40 hover:border-[#3FAF5E]/30 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3FAF5E]/15 to-[#8FD14F]/15 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-[#3FAF5E]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-sm font-semibold text-[#1A1A1A]">{b.batchId}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[b.status] || ""}`}>
                    {b.status.replace("-", " ")}
                  </span>
                </div>
                <div className="text-xs text-[#1A1A1A]/40">
                  {b.variety} • {b.quantity} • Origin: {b.origin} • RFID: <span className="font-mono">{b.rfidTag}</span>
                </div>
              </div>
              <button onClick={() => setShowQR(showQR === b.batchId ? null : b.batchId)}
                className="p-2 rounded-xl hover:bg-[#F7F7F7] transition-colors shrink-0">
                <QrCode className="w-4 h-4 text-[#1A1A1A]/40" />
              </button>
              {showQR === b.batchId && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl p-3 shadow-lg border border-[#E8E6E1]">
                  <QRCodeSVG value={JSON.stringify(batchQRData(b))} size={100} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
