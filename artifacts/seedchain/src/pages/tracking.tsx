import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
  MapPin, Truck, Package, CheckCircle2, Circle, Search,
  Warehouse, ShoppingBag, Sprout, Clock, ArrowRight, Copy, ExternalLink
} from "lucide-react";
import { dummyShipment, allShipments, batchQRData, type Shipment } from "@/lib/supply-chain";

function getStatusColor(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    created: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
    harvested: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]", dot: "bg-[#3FAF5E]" },
    stored: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]", dot: "bg-[#3B82F6]" },
    "in-transit": { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
    delivered: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]", dot: "bg-[#3FAF5E]" },
  };
  return map[status] || map.created;
}

export default function TrackingPage() {
  const [, params] = useRoute("/tracking/:trackingId");
  const [searchInput, setSearchInput] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [searched, setSearched] = useState(false);

  const trackingId = params?.trackingId;

  const findShipment = (id: string) => {
    const found = allShipments.find((s) => s.trackingId.toLowerCase() === id.toLowerCase());
    setShipment(found || null);
    setSearched(true);
  };

  useEffect(() => {
    if (trackingId) {
      setSearchInput(trackingId);
      findShipment(trackingId);
    }
  }, [trackingId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) findShipment(searchInput.trim());
  };

  const s = shipment;
  const statusStyle = s ? getStatusColor(s.status) : null;

  return (
    <PageTransition className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      <div className="pt-28 pb-20 px-4 sm:px-6 max-w-[1100px] mx-auto">
        {/* Search */}
        <div className="text-center mb-12">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-3">
            Track Your Shipment
          </motion.h1>
          <p className="text-[#1A1A1A]/50 text-lg mb-8">Enter a tracking ID to see real-time supply chain status</p>

          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A1A1A]/30" />
              <Input
                placeholder="e.g. TRK-48293"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 h-14 rounded-2xl text-base border-[#E8E6E1] bg-white focus-visible:ring-[#3FAF5E] focus-visible:border-[#3FAF5E] shadow-sm"
              />
            </div>
            <Button type="submit" className="rounded-2xl h-14 px-8 bg-[#3FAF5E] hover:bg-[#3FAF5E]/90 text-white text-base font-medium shadow-sm">
              Track
            </Button>
          </form>

          {/* Quick links */}
          <div className="mt-4 flex justify-center gap-3 flex-wrap">
            {allShipments.map((sh) => (
              <Link key={sh.trackingId} href={`/tracking/${sh.trackingId}`}>
                <button className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-[#E8E6E1] text-[#1A1A1A]/60 hover:border-[#3FAF5E] hover:text-[#3FAF5E] transition-all shadow-sm">
                  {sh.trackingId}
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {!searched && !s && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[28px] p-12 text-center shadow-sm border border-[#E8E6E1]/60 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#3FAF5E]/10 flex items-center justify-center mx-auto mb-5">
              <Truck className="w-8 h-8 text-[#3FAF5E]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Shipment Tracking</h3>
            <p className="text-[#1A1A1A]/50">Enter a tracking ID above to view the complete supply chain journey.</p>
          </motion.div>
        )}

        {/* Not found */}
        {searched && !s && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[28px] p-12 text-center shadow-sm border border-[#E8E6E1]/60 max-w-lg mx-auto">
            <Package className="w-12 h-12 text-[#1A1A1A]/20 mx-auto mb-4" />
            <p className="text-[#1A1A1A]/50">Tracking ID not found. Try one of the demo IDs above.</p>
          </motion.div>
        )}

        {/* ── Shipment Details ── */}
        {s && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Header card */}
            <div className="bg-white rounded-[28px] shadow-sm border border-[#E8E6E1]/60 overflow-hidden">
              <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-[#1A1A1A]">{s.trackingId}</h2>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle!.bg} ${statusStyle!.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle!.dot}`} />
                      {s.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[#1A1A1A]/40 block text-xs">Batch ID</span>
                      <span className="font-semibold text-[#1A1A1A]">{s.batch.batchId}</span>
                    </div>
                    <div>
                      <span className="text-[#1A1A1A]/40 block text-xs">Variety</span>
                      <span className="font-semibold text-[#1A1A1A]">{s.batch.variety}</span>
                    </div>
                    <div>
                      <span className="text-[#1A1A1A]/40 block text-xs">Quantity</span>
                      <span className="font-semibold text-[#1A1A1A]">{s.batch.quantity}</span>
                    </div>
                    <div>
                      <span className="text-[#1A1A1A]/40 block text-xs">Grade</span>
                      <span className={`font-semibold ${s.batch.grade === "A" ? "text-[#3FAF5E]" : "text-[#F59E0B]"}`}>Grade {s.batch.grade}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-[#1A1A1A]/50">
                      <Sprout className="w-3.5 h-3.5" /> {s.batch.farmerName}
                    </div>
                    <div className="flex items-center gap-2 text-[#1A1A1A]/50">
                      <MapPin className="w-3.5 h-3.5" /> {s.batch.origin}
                    </div>
                    <div className="flex items-center gap-2 text-[#1A1A1A]/50">
                      <Truck className="w-3.5 h-3.5" /> {s.carrier}
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="shrink-0 bg-[#F7F7F7] rounded-[20px] p-5 flex flex-col items-center gap-3">
                  <QRCodeSVG value={`${window.location.origin}/tracking/${s.trackingId}`} size={120} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
                  <span className="text-[10px] text-[#1A1A1A]/40 font-mono">{s.batch.rfidTag}</span>
                  <span className="text-[10px] text-[#1A1A1A]/30">Scan to track</span>
                </div>
              </div>

              {/* Route map placeholder */}
              <div className="h-48 bg-gradient-to-br from-[#3FAF5E]/[0.04] via-[#3B82F6]/[0.04] to-[#8FD14F]/[0.04] relative flex items-center justify-center border-t border-[#E8E6E1]/40">
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233FAF5E' fill-opacity='1'%3E%3Cpath d='M0 0h1v1H0V0zm20 20h1v1h-1v-1z'/%3E%3C/g%3E%3C/svg%3E")` }} />
                <div className="relative z-10 flex items-center gap-6 sm:gap-12">
                  <div className="text-center">
                    <div className="w-11 h-11 rounded-2xl bg-[#3FAF5E]/15 flex items-center justify-center mx-auto mb-1.5">
                      <MapPin className="w-5 h-5 text-[#3FAF5E]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1A1A1A]">{s.origin.name.split(",")[0]}</p>
                    <p className="text-[10px] text-[#1A1A1A]/40">Origin</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 sm:w-20 h-[2px] bg-[#3FAF5E]" />
                    <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-9 h-9 rounded-xl bg-[#3B82F6] flex items-center justify-center shadow-md">
                      <Truck className="w-4 h-4 text-white" />
                    </motion.div>
                    <div className="w-12 sm:w-20 h-[2px] bg-[#E8E6E1]" />
                  </div>
                  <div className="text-center">
                    <div className="w-11 h-11 rounded-2xl bg-[#3B82F6]/15 flex items-center justify-center mx-auto mb-1.5">
                      <MapPin className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1A1A1A]">{s.destination.name.split(",")[0]}</p>
                    <p className="text-[10px] text-[#1A1A1A]/40">Destination</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-[28px] shadow-sm border border-[#E8E6E1]/60 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">Supply Chain Timeline</h3>
              <div className="relative">
                {s.events.map((ev, i) => {
                  const isLast = i === s.events.length - 1;
                  return (
                    <div key={ev.id} className="flex gap-4 mb-0">
                      {/* Vertical line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          ev.completed ? "bg-[#3FAF5E] text-white" : ev.current ? "bg-[#F59E0B] text-white ring-4 ring-[#F59E0B]/20" : "bg-[#E8E6E1] text-[#1A1A1A]/30"
                        }`}>
                          {ev.completed ? <CheckCircle2 className="w-4 h-4" /> : ev.current ? <Clock className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </div>
                        {!isLast && (
                          <div className={`w-[2px] min-h-[40px] flex-1 my-1 ${ev.completed ? "bg-[#3FAF5E]" : "bg-[#E8E6E1]"}`} />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${ev.completed || ev.current ? "text-[#1A1A1A]" : "text-[#1A1A1A]/35"}`}>{ev.label}</span>
                          {ev.current && <span className="text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full">Current</span>}
                        </div>
                        {ev.description && <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{ev.description}</p>}
                        {ev.timestamp && (
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-[#1A1A1A]/35">
                            <span>{ev.timestamp}</span>
                            {ev.location && <span>· {ev.location}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Batch QR data card */}
            <div className="bg-white rounded-[28px] shadow-sm border border-[#E8E6E1]/60 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Digital Batch Identity</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {[
                    { label: "Batch ID", value: s.batch.batchId },
                    { label: "RFID Tag", value: s.batch.rfidTag },
                    { label: "Farmer", value: s.batch.farmerName },
                    { label: "Variety", value: s.batch.variety },
                    { label: "Harvest Date", value: s.batch.harvestDate },
                    { label: "Origin", value: s.batch.origin },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#E8E6E1]/40 last:border-0">
                      <span className="text-xs text-[#1A1A1A]/40">{item.label}</span>
                      <span className="text-sm font-semibold text-[#1A1A1A]">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-center bg-[#F7F7F7] rounded-[20px] p-6">
                  <QRCodeSVG value={batchQRData(s.batch)} size={160} level="H" bgColor="#F7F7F7" fgColor="#1A1A1A" />
                  <p className="text-[10px] text-[#1A1A1A]/30 mt-3">Batch QR — contains full provenance data</p>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
