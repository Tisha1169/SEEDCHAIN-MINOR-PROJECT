import { motion } from "framer-motion";
import { ShoppingBag, Package, TrendingUp, Truck, ArrowUpRight } from "lucide-react";
import { buyerOrders } from "@/lib/supply-chain";
import { Link } from "wouter";

const metrics = [
  { label: "Total Orders", value: String(buyerOrders.length), change: "+2", gradient: "from-[#8B5CF6] to-[#A78BFA]", icon: ShoppingBag },
  { label: "In Transit", value: String(buyerOrders.filter(o => o.status === "shipped").length), change: "Active", gradient: "from-[#F59E0B] to-[#FBBF24]", icon: Truck },
  { label: "Delivered", value: String(buyerOrders.filter(o => o.status === "delivered").length), change: "+1", gradient: "from-[#3FAF5E] to-[#8FD14F]", icon: Package },
  { label: "Total Spent", value: `₹${(buyerOrders.reduce((a, o) => a + o.totalPrice, 0) / 1000).toFixed(0)}K`, change: "+18%", gradient: "from-[#3B82F6] to-[#60A5FA]", icon: TrendingUp },
];

const statusBadge: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-600" },
  confirmed: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]" },
  shipped: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  delivered: { bg: "bg-[#3FAF5E]/10", text: "text-[#3FAF5E]" },
};

export default function BuyerDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center`}>
                <m.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-[#3FAF5E] flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{m.change}</span>
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{m.value}</div>
            <div className="text-xs text-[#1A1A1A]/40">{m.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {buyerOrders.map(o => {
              const sb = statusBadge[o.status] || statusBadge.pending;
              return (
                <div key={o.id} className="flex items-center justify-between p-4 rounded-2xl border border-[#E8E6E1]/60 hover:shadow-sm transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-[#1A1A1A]">{o.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${sb.bg} ${sb.text}`}>{o.status}</span>
                    </div>
                    <div className="text-xs text-[#1A1A1A]/40">{o.variety} · {o.quantityKg.toLocaleString()} kg · {o.farmerName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#1A1A1A]">₹{o.totalPrice.toLocaleString()}</div>
                    <Link href={`/tracking/${o.trackingId}`}>
                      <span className="text-[10px] text-[#3FAF5E] font-medium hover:underline cursor-pointer">{o.trackingId}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="space-y-3">
          {[
            { label: "Browse Marketplace", href: "/buyer/marketplace", emoji: "🛒" },
            { label: "My Orders", href: "/buyer/orders", emoji: "📦" },
            { label: "Track Delivery", href: "/tracking", emoji: "🗺️" },
          ].map(a => (
            <Link key={a.label} href={a.href}>
              <motion.div whileHover={{ y: -3 }}
                className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8E6E1]/60 flex items-center gap-4 hover:border-[#8B5CF6]/30 transition-all cursor-pointer">
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{a.label}</span>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
