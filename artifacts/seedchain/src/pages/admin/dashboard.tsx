import { motion } from "framer-motion";
import { Package, Truck, Users, Warehouse, TrendingUp, ArrowUpRight, ArrowDownRight, Loader } from "lucide-react";
import { useListBatches } from "@lib/api-client-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Link } from "wouter";

const revenueData = [
  { month: "Jan", revenue: 120000 }, { month: "Feb", revenue: 185000 }, { month: "Mar", revenue: 240000 },
  { month: "Apr", revenue: 320000 }, { month: "May", revenue: 280000 }, { month: "Jun", revenue: 360000 },
  { month: "Jul", revenue: 337000 },
];

const statusDistribution = [
  { name: "In Transit", value: 8, color: "#F59E0B" },
  { name: "Stored", value: 14, color: "#3B82F6" },
  { name: "Delivered", value: 22, color: "#3FAF5E" },
  { name: "Harvested", value: 4, color: "#8B5CF6" },
];

export default function AdminDashboard() {
  const { data: batches = [], isLoading } = useListBatches();
  
  const metrics = [
    { label: "Total Batches", value: String(batches.length), change: "+8", positive: true, gradient: "from-[#3FAF5E] to-[#8FD14F]", icon: Package },
    { label: "Active Deliveries", value: "12", change: "+3", positive: true, gradient: "from-[#F59E0B] to-[#FBBF24]", icon: Truck },
    { label: "Total Farmers", value: "24", change: "+5", positive: true, gradient: "from-[#3B82F6] to-[#60A5FA]", icon: Users },
    { label: "Storage Usage", value: "68%", change: "-4%", positive: false, gradient: "from-[#8B5CF6] to-[#A78BFA]", icon: Warehouse },
  ];

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
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${m.positive ? "text-[#3FAF5E]" : "text-red-500"}`}>
                {m.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{m.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{m.value}</div>
            <div className="text-xs text-[#1A1A1A]/40">{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Revenue + Pie */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A]">Platform Revenue</h3>
              <p className="text-xs text-[#1A1A1A]/40">Monthly revenue trend</p>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#3FAF5E]" />
              <span className="text-lg font-bold text-[#1A1A1A]">₹{(adminStats.totalRevenue / 100000).toFixed(1)}L</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="aRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3FAF5E" stopOpacity={0.25}/><stop offset="95%" stopColor="#3FAF5E" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fontSize: 11 }} stroke="#ccc" tickFormatter={v => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#3FAF5E" strokeWidth={2.5} fill="url(#aRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Batch Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                {statusDistribution.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {statusDistribution.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[#1A1A1A]/50">{s.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Supply Chain Map placeholder + Active Shipments */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-[#3FAF5E]/[0.04] via-[#3B82F6]/[0.04] to-[#8FD14F]/[0.04] rounded-[24px] p-6 border border-[#E8E6E1]/60 relative overflow-hidden min-h-[250px] flex items-center justify-center">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233FAF5E' fill-opacity='1'%3E%3Cpath d='M0 0h1v1H0V0zm20 20h1v1h-1v-1z'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="text-center relative z-10">
            <h3 className="font-bold text-[#1A1A1A] mb-2">Supply Chain Map</h3>
            <p className="text-xs text-[#1A1A1A]/40 mb-4">Live visualization of all shipment routes</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {allShipments.map(s => (
                <Link key={s.trackingId} href={`/tracking/${s.trackingId}`}>
                  <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-[#E8E6E1]/60 text-xs hover:shadow-md transition-all cursor-pointer">
                    <span className="font-mono font-medium text-[#1A1A1A]">{s.trackingId}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${s.status === "in-transit" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : s.status === "delivered" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-[#3B82F6]/10 text-[#3B82F6]"}`}>
                      {s.status.replace("-", " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Users", href: "/admin/users", emoji: "👥" },
              { label: "All Batches", href: "/admin/batches", emoji: "🌱" },
              { label: "Storage", href: "/admin/storage", emoji: "❄️" },
              { label: "Analytics", href: "/admin/supply-chain-map", emoji: "📊" },
            ].map(a => (
              <Link key={a.label} href={a.href}>
                <motion.div whileHover={{ y: -3 }}
                  className="rounded-[18px] p-4 border border-[#E8E6E1]/60 hover:border-[#3FAF5E]/30 transition-all cursor-pointer text-center">
                  <span className="text-2xl block mb-1">{a.emoji}</span>
                  <span className="text-xs font-medium text-[#1A1A1A]">{a.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
