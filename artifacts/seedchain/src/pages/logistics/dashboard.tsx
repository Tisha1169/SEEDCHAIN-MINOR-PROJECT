import { motion } from "framer-motion";
import { Truck, Package, MapPin, TrendingUp, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { deliveryJobs } from "@/lib/supply-chain";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "wouter";

const deliveryData = [
  { day: "Mon", count: 3 }, { day: "Tue", count: 5 }, { day: "Wed", count: 4 },
  { day: "Thu", count: 7 }, { day: "Fri", count: 6 }, { day: "Sat", count: 2 },
];

const metrics = [
  { label: "Active Deliveries", value: String(deliveryJobs.filter(d => d.status === "in-transit").length), change: "+2", gradient: "from-[#F59E0B] to-[#FBBF24]", icon: Truck },
  { label: "Pending Pickup", value: String(deliveryJobs.filter(d => d.status === "pending").length), change: "1 new", gradient: "from-[#3B82F6] to-[#60A5FA]", icon: Package },
  { label: "Delivered", value: String(deliveryJobs.filter(d => d.status === "delivered").length), change: "+5", gradient: "from-[#3FAF5E] to-[#8FD14F]", icon: CheckCircle2 },
  { label: "On-Time Rate", value: "96%", change: "+2%", gradient: "from-[#8B5CF6] to-[#A78BFA]", icon: TrendingUp },
];

export default function LogisticsDashboard() {
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
          <h3 className="font-bold text-[#1A1A1A] mb-1">Weekly Deliveries</h3>
          <p className="text-xs text-[#1A1A1A]/40 mb-4">Completed deliveries this week</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={deliveryData}>
              <defs>
                <linearGradient id="lDel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fontSize: 11 }} stroke="#ccc" />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2.5} fill="url(#lDel)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="space-y-3">
          {[
            { label: "View Deliveries", href: "/logistics/deliveries", emoji: "📦" },
            { label: "Track Shipments", href: "/logistics/tracking", emoji: "🗺️" },
            { label: "Update Location", href: "/logistics/update-location", emoji: "📍" },
          ].map(a => (
            <Link key={a.label} href={a.href}>
              <motion.div whileHover={{ y: -3 }}
                className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8E6E1]/60 flex items-center gap-4 hover:border-[#F59E0B]/30 transition-all cursor-pointer">
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{a.label}</span>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Active Jobs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E1]/60">
                {["Tracking", "Batch", "Pickup", "Dropoff", "Vehicle", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-[#1A1A1A]/40 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliveryJobs.map(d => (
                <tr key={d.id} className="border-b border-[#E8E6E1]/30 hover:bg-[#F7F7F7] transition-colors">
                  <td className="py-3 pr-4 font-mono text-xs text-[#1A1A1A]/60">{d.trackingId}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{d.batchId}</td>
                  <td className="py-3 pr-4 text-[#1A1A1A]/60 text-xs">{d.pickup}</td>
                  <td className="py-3 pr-4 text-[#1A1A1A]/60 text-xs">{d.dropoff}</td>
                  <td className="py-3 pr-4 font-medium text-xs">{d.vehicleNo}</td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${d.status === "in-transit" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : d.status === "delivered" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-[#3B82F6]/10 text-[#3B82F6]"}`}>
                      {d.status.replace("-", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
