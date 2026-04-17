import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Scan, CheckCircle2, Package, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { dummyBatches, batchQRData, pendingIncoming } from "@/lib/supply-chain";
import { useToast } from "@/hooks/use-toast";

export default function StorageIncoming() {
  const { toast } = useToast();
  const [rfidInput, setRfidInput] = useState("");
  const [found, setFound] = useState<typeof dummyBatches[0] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepted, setAccepted] = useState<string[]>([]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const batch = dummyBatches.find(b => b.rfidTag.toLowerCase() === rfidInput.toLowerCase() || b.batchId.toLowerCase() === rfidInput.toLowerCase());
    if (batch) { setFound(batch); setNotFound(false); }
    else { setFound(null); setNotFound(true); }
  };

  const handleAccept = (batchId: string) => {
    setAccepted(prev => [...prev, batchId]);
    setFound(null);
    setRfidInput("");
    toast({ title: "Batch Accepted!", description: `${batchId} — status updated to Stored` });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Scan Incoming Shipment</h2>
        <p className="text-sm text-[#1A1A1A]/40">Scan QR code or enter RFID tag to accept a batch</p>
      </div>

      {/* Scanner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center">
            <Scan className="w-5 h-5 text-[#3B82F6]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">QR / RFID Scanner</h3>
            <p className="text-xs text-[#1A1A1A]/40">Enter RFID tag ID or Batch ID</p>
          </div>
        </div>
        <form onSubmit={handleScan} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
            <input value={rfidInput} onChange={e => setRfidInput(e.target.value)} placeholder="e.g. RFID-8473920183 or BATCH-2026-0001"
              className="w-full h-12 pl-11 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] text-sm focus:outline-none focus:border-[#3B82F6]" />
          </div>
          <button type="submit" className="h-12 px-6 rounded-2xl bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#3B82F6]/90 transition-colors">
            Scan
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-[10px] text-[#1A1A1A]/40">Try:</span>
          {dummyBatches.map(b => (
            <button key={b.rfidTag} onClick={() => setRfidInput(b.rfidTag)} className="text-[10px] px-2 py-1 rounded-lg bg-[#F7F7F7] border border-[#E8E6E1] text-[#1A1A1A]/60 hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors font-mono">
              {b.rfidTag}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Scan result */}
      {notFound && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-[20px] p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">No batch found for that RFID / Batch ID. Check and try again.</p>
        </motion.div>
      )}

      {found && !accepted.includes(found.batchId) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[28px] p-6 shadow-sm border border-[#3B82F6]/30">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="font-semibold text-[#1A1A1A]">Batch Found</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2 text-sm">
              {[["Batch ID", found.batchId], ["Variety", found.variety], ["Farmer", found.farmerName], ["Quantity", found.quantity], ["Grade", `Grade ${found.grade}`], ["Origin", found.origin], ["RFID", found.rfidTag]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-[#E8E6E1]/40">
                  <span className="text-[#1A1A1A]/40">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center bg-[#F7F7F7] rounded-2xl p-5 gap-3">
              <QRCodeSVG value={batchQRData(found)} size={130} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
              <span className="text-[10px] text-[#1A1A1A]/40">Batch QR verified</span>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => handleAccept(found.batchId)}
              className="flex-1 h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Accept Shipment
            </button>
            <button onClick={() => { setFound(null); setRfidInput(""); }}
              className="px-6 h-12 rounded-2xl border border-[#E8E6E1] text-[#1A1A1A] font-medium hover:bg-[#F7F7F7] transition-colors">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Pending incoming */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-[28px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Scheduled Arrivals</h3>
        <div className="space-y-3">
          {pendingIncoming.map(item => {
            const isAccepted = accepted.includes(item.batchId);
            return (
              <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isAccepted ? "border-[#3FAF5E]/30 bg-[#3FAF5E]/5" : "border-[#E8E6E1]/60 hover:border-[#3B82F6]/30"}`}>
                <div>
                  <div className="text-sm font-semibold text-[#1A1A1A]">{item.batchId} — {item.variety}</div>
                  <div className="text-xs text-[#1A1A1A]/40">{item.farmerName} · {item.origin} · {item.quantityKg.toLocaleString()} kg · Due {item.scheduledDate}</div>
                </div>
                {isAccepted ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Accepted
                  </span>
                ) : (
                  <button onClick={() => { setRfidInput(item.rfidTag); }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] font-medium hover:bg-[#3B82F6]/20 transition-colors">
                    Scan to Accept
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
