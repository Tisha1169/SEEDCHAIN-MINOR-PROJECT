import { useState } from "react";
import { motion } from "framer-motion";
import { marketplaceListings, batchQRData, generateTrackingId } from "@/lib/supply-chain";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Calendar, Package, Search, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function BuyerMarketplace() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);

  const filtered = marketplaceListings.filter(l =>
    l.batch.variety.toLowerCase().includes(search.toLowerCase()) || l.batch.origin.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrder = (listingId: string, batchId: string) => {
    const tid = generateTrackingId();
    setOrdered(prev => [...prev, listingId]);
    toast({ title: "Order Placed!", description: `Tracking ID: ${tid} — Batch ${batchId}` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Marketplace</h2>
          <p className="text-sm text-[#1A1A1A]/40">Browse and purchase certified potato seed batches</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
          <input placeholder="Search variety or origin..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-10 rounded-2xl border border-[#E8E6E1] bg-white text-sm focus:outline-none focus:border-[#8B5CF6]" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((l, i) => {
          const isOrdered = ordered.includes(l.id);
          return (
            <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className={`bg-white rounded-[24px] p-5 shadow-sm border transition-all ${isOrdered ? "border-[#3FAF5E]/30" : "border-[#E8E6E1]/60 hover:shadow-md"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-[#1A1A1A]/35">{l.batch.batchId}</span>
                  <h3 className="text-base font-bold text-[#1A1A1A]">{l.batch.variety}</h3>
                </div>
                {isOrdered ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#3FAF5E]/10 text-[#3FAF5E] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ordered
                  </span>
                ) : (
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${l.available ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-gray-100 text-gray-500"}`}>
                    {l.available ? "Available" : "Sold Out"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center bg-[#F7F7F7] rounded-2xl p-3 mb-3">
                <QRCodeSVG value={batchQRData(l.batch)} size={80} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
              </div>
              <p className="text-xs text-[#1A1A1A]/50 mb-3 leading-relaxed">{l.description}</p>
              <div className="space-y-1.5 text-[11px] mb-4">
                <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><MapPin className="w-3 h-3" />Origin</span><span className="font-medium">{l.batch.origin}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><Calendar className="w-3 h-3" />Harvest</span><span className="font-medium">{l.batch.harvestDate}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><Package className="w-3 h-3" />Min Order</span><span className="font-medium">{l.minOrder}</span></div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#E8E6E1]/40">
                <div>
                  <span className="text-xl font-bold text-[#8B5CF6]">₹{l.pricePerKg}</span>
                  <span className="text-xs text-[#1A1A1A]/40">/kg</span>
                </div>
                {!isOrdered && l.available && (
                  <button onClick={() => handleOrder(l.id, l.batch.batchId)}
                    className="h-9 px-4 rounded-xl bg-[#8B5CF6] text-white text-xs font-medium hover:bg-[#8B5CF6]/90 transition-colors">
                    Place Order
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
