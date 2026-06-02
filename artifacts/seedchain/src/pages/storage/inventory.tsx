import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Search, Warehouse, Loader } from "lucide-react";
import { useState } from "react";
import { useListBatches } from "@lib/api-client-react";

export default function StorageInventory() {
  const [search, setSearch] = useState("");
  const { data: batches = [], isLoading } = useListBatches();
  
  const filtered = batches.filter((b: any) =>
    b.batchCode.toLowerCase().includes(search.toLowerCase()) || 
    b.variety.toLowerCase().includes(search.toLowerCase())
  ).filter((b: any) => b.status === "in_storage");

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Storage Inventory</h2>
          <p className="text-sm text-[#1A1A1A]/40">All batches currently stored in your facility</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
          <input placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-10 rounded-2xl border border-[#E8E6E1] bg-white text-sm focus:outline-none focus:border-[#3B82F6]" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 text-[#3FAF5E] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-[#1A1A1A]/40">
          <p>No batches in storage</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b: any, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-[#1A1A1A]/35">{b.batchCode}</span>
                  <h3 className="text-base font-bold text-[#1A1A1A]">{b.variety}</h3>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold capitalize bg-[#3FAF5E]/10 text-[#3FAF5E]`}>
                  Stored
                </span>
              </div>
              <div className="flex items-center justify-center bg-[#F7F7F7] rounded-2xl p-3 mb-3">
                <QRCodeSVG value={JSON.stringify({ batchCode: b.batchCode, variety: b.variety })} size={80} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Quantity</span><span className="font-semibold">{b.quantityKg.toLocaleString()} kg</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Variety</span><span className="font-medium">{b.variety}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Status</span><span className="capitalize">{b.status.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Date</span><span className="font-medium">{b.createdAt?.split("T")[0]}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
