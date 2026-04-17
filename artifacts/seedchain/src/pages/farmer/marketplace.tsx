import { motion } from "framer-motion";
import { marketplaceListings } from "@/lib/supply-chain";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Calendar, Package } from "lucide-react";
import { Link } from "wouter";

export default function FarmerMarketplace() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">My Listings</h2>
        <p className="text-sm text-[#1A1A1A]/40">Batches you've listed for sale on the marketplace</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketplaceListings.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3 }}
            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-mono text-[#1A1A1A]/35">{l.batch.batchId}</span>
                <h3 className="text-base font-bold text-[#1A1A1A]">{l.batch.variety}</h3>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${l.available ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-gray-100 text-gray-500"}`}>
                {l.available ? "Available" : "Sold Out"}
              </span>
            </div>
            <div className="flex items-center justify-center bg-[#F7F7F7] rounded-2xl p-3 mb-3">
              <QRCodeSVG value={JSON.stringify({ batch: l.batch.batchId, price: l.pricePerKg })} size={80} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
            </div>
            <p className="text-xs text-[#1A1A1A]/50 mb-3 leading-relaxed">{l.description}</p>
            <div className="space-y-1.5 text-[11px] mb-4">
              <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><MapPin className="w-3 h-3" />Origin</span><span className="font-medium">{l.batch.origin}</span></div>
              <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><Calendar className="w-3 h-3" />Harvest</span><span className="font-medium">{l.batch.harvestDate}</span></div>
              <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><Package className="w-3 h-3" />Min Order</span><span className="font-medium">{l.minOrder}</span></div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold text-[#3FAF5E]">₹{l.pricePerKg}</span>
                <span className="text-xs text-[#1A1A1A]/40">/kg</span>
              </div>
              <span className="text-xs text-[#1A1A1A]/40">{l.batch.quantity} available</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
