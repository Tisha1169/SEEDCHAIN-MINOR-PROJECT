import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import { marketplaceListings, batchQRData } from "@/lib/supply-chain";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Calendar, Package, Search, Leaf } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function PublicMarketplace() {
  const [search, setSearch] = useState("");
  const filtered = marketplaceListings.filter(
    l => l.batch.variety.toLowerCase().includes(search.toLowerCase()) || l.batch.origin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition className="min-h-screen bg-[#F7F7F7]">
      <Navbar />
      <div className="pt-28 pb-20 px-4 sm:px-6 max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-4 border border-[#3FAF5E]/20">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-semibold">Seed Marketplace</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-3">Browse Certified Potato Seeds</h1>
          <p className="text-[#1A1A1A]/50 text-lg mb-8">Every batch tracked from farm to you with QR & RFID verification</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A1A1A]/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by variety or origin..."
              className="w-full h-14 pl-12 rounded-2xl border border-[#E8E6E1] bg-white text-base focus:outline-none focus:border-[#3FAF5E] shadow-sm" />
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-[28px] p-5 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
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
                <QRCodeSVG value={batchQRData(l.batch)} size={90} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
              </div>
              <p className="text-xs text-[#1A1A1A]/50 mb-3 leading-relaxed">{l.description}</p>
              <div className="space-y-1.5 text-[11px] mb-4">
                <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><MapPin className="w-3 h-3" />Origin</span><span className="font-medium">{l.batch.origin}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><Calendar className="w-3 h-3" />Harvest</span><span className="font-medium">{l.batch.harvestDate}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1 text-[#1A1A1A]/40"><Package className="w-3 h-3" />Grade</span><span className={`font-semibold ${l.batch.grade === "A" ? "text-[#3FAF5E]" : "text-[#F59E0B]"}`}>Grade {l.batch.grade}</span></div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#E8E6E1]/40">
                <div>
                  <span className="text-xl font-bold text-[#3FAF5E]">₹{l.pricePerKg}</span>
                  <span className="text-xs text-[#1A1A1A]/40">/kg</span>
                </div>
                <Link href="/register">
                  <button className="h-9 px-4 rounded-xl bg-[#3FAF5E] text-white text-xs font-medium hover:bg-[#3FAF5E]/90 transition-colors">
                    Buy Now
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
