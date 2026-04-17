import { motion } from "framer-motion";
import { storageInventory, batchQRData, dummyBatches } from "@/lib/supply-chain";
import { QRCodeSVG } from "qrcode.react";
import { Search, Warehouse } from "lucide-react";
import { useState } from "react";

export default function StorageInventory() {
  const [search, setSearch] = useState("");
  const filtered = storageInventory.filter(s =>
    s.batchId.toLowerCase().includes(search.toLowerCase()) || s.variety.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => {
          const batch = dummyBatches.find(b => b.batchId === s.batchId);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-[#1A1A1A]/35">{s.batchId}</span>
                  <h3 className="text-base font-bold text-[#1A1A1A]">{s.variety}</h3>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold capitalize ${s.status === "stored" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : s.status === "releasing" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-gray-100 text-gray-500"}`}>
                  {s.status}
                </span>
              </div>
              {batch && (
                <div className="flex items-center justify-center bg-[#F7F7F7] rounded-2xl p-3 mb-3">
                  <QRCodeSVG value={batchQRData(batch)} size={80} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
                </div>
              )}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Farmer</span><span className="font-medium">{s.farmerName}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Quantity</span><span className="font-semibold">{s.quantityKg.toLocaleString()} kg</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Temperature</span><span className="text-[#3B82F6] font-medium">{s.temperatureC}°C</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Humidity</span><span className="font-medium">{s.humidityPct}%</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Chamber</span><span className="font-medium">{s.chamber}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">RFID</span><span className="font-mono text-[10px] text-[#1A1A1A]/50">{s.rfidTag}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Stored Since</span><span className="font-medium">{s.arrivalDate}</span></div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
