import { motion } from "framer-motion";
import { buyerOrders } from "@/lib/supply-chain";
import { Package, Truck, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

const statusBadge: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-600", icon: Package },
  confirmed: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]", icon: Package },
  shipped: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", icon: Truck },
  delivered: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]", icon: CheckCircle2 },
};

export default function BuyerOrders() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">My Orders</h2>
        <p className="text-sm text-[#1A1A1A]/40">Track all your potato seed orders</p>
      </div>

      <div className="space-y-4">
        {buyerOrders.map((o, i) => {
          const sb = statusBadge[o.status] || statusBadge.pending;
          const Icon = sb.icon;
          return (
            <motion.div key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sb.bg}`}>
                    <Icon className={`w-6 h-6 ${sb.text}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[#1A1A1A]">{o.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${sb.bg} ${sb.text}`}>{o.status}</span>
                    </div>
                    <div className="text-xs text-[#1A1A1A]/40">{o.variety} · {o.quantityKg.toLocaleString()} kg · {o.farmerName} · {o.origin}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#1A1A1A]">₹{o.totalPrice.toLocaleString()}</div>
                    <div className="text-[10px] text-[#1A1A1A]/40">Ordered {o.orderDate}</div>
                  </div>
                  <Link href={`/tracking/${o.trackingId}`}>
                    <button className="h-9 px-4 rounded-xl bg-[#3FAF5E]/10 text-[#3FAF5E] text-xs font-medium hover:bg-[#3FAF5E]/20 transition-colors">
                      Track
                    </button>
                  </Link>
                </div>
              </div>

              <div className="mt-4 bg-[#F7F7F7] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div><span className="text-[#1A1A1A]/40 block">Batch ID</span><span className="font-mono font-medium">{o.batchId}</span></div>
                <div><span className="text-[#1A1A1A]/40 block">Tracking ID</span><span className="font-mono font-medium">{o.trackingId}</span></div>
                <div><span className="text-[#1A1A1A]/40 block">Quantity</span><span className="font-medium">{o.quantityKg.toLocaleString()} kg</span></div>
                <div><span className="text-[#1A1A1A]/40 block">Price/kg</span><span className="font-medium">₹{(o.totalPrice / o.quantityKg).toFixed(0)}</span></div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
